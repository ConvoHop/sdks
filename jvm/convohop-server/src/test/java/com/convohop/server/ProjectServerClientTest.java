package com.convohop.server;

import static com.convohop.server.testing.Fixtures.context;
import static com.convohop.server.testing.Fixtures.full;
import static com.convohop.server.testing.Fixtures.input;
import static com.convohop.server.testing.Fixtures.map;
import static com.convohop.server.testing.Fixtures.reply;
import static com.convohop.server.testing.Fixtures.requestId;
import static com.convohop.server.testing.Fixtures.resolution;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.convohop.server.api.Operations;
import com.convohop.server.internal.Json;
import com.convohop.server.internal.OperationCatalog;
import com.convohop.server.internal.OperationDescriptor;
import com.convohop.server.model.Conversation;
import com.convohop.server.model.CreateConversationRequestInput;
import com.convohop.server.model.InboxRequestInput;
import com.convohop.server.model.Member;
import com.convohop.server.model.MemberBatchEntryInput;
import com.convohop.server.model.MemberInputInput;
import com.convohop.server.model.MessageAck;
import com.convohop.server.model.RequestResolution;
import com.convohop.server.model.SessionBootstrap;
import com.convohop.server.testing.FakeAuthority;
import com.convohop.server.testing.FakeAuthority.Exchange;
import com.convohop.server.testing.FakeAuthority.Response;
import com.convohop.server.testing.RecordingStorage;
import com.convohop.server.testing.Repo;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.function.Supplier;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

/**
 * Ports {@code packages/server/test/server.test.mjs} and covers the transport: recovery records, the retry budget,
 * authority errors and retry delays, malformed replies, redirects and origins.
 */
class ProjectServerClientTest {
  private static final String KEY = "fixture-backend-key-never-in-errors";
  private static final String MALFORMED = "Malformed authority response; resolve the original request";

  @Test
  void onboardingSendsTheBackendKeyAndCarriesTheServingEpochAfterInitialize() {
    String projectId = id(), incarnation = id(), principalId = id(), deviceId = id(), conversationId = id();
    Map<String, Object> session = map("sessionId", id(), "principalId", principalId, "deviceId", deviceId,
        "incarnation", incarnation, "sessionRevision", "1", "expiresAt", "2030-01-01T00:00:00.000Z", "status", "active");
    Map<String, Object> issued = map(
        "session", session, "sessionToken", "fixture-user-session", "tokenExpiresAt", "2030-01-01T00:00:00.000Z");
    RecordingStorage storage = new RecordingStorage();
    try (FakeAuthority authority = new FakeAuthority(exchange -> {
      Map<String, Object> request = exchange.request();
      switch (exchange.operationName()) {
        case "CommunicationRoute":
          return Response.json(reply(request,
              map("result", route(projectId, incarnation, "2"))));
        case "CommunicationCreatePrincipal":
          return Response.json(reply(request, map("result", map("principalId", principalId,
              "externalUserId", "authenticated-account", "status", "active", "revision", "1"))));
        case "CommunicationIssueSession":
          return Response.json(reply(request, map("result", issued)));
        case "CommunicationCreateConversation":
          return created(exchange, conversationId);
        default:
          return Response.status(500, "{}");
      }
    })) {
      ProjectServerClient client = client(authority, projectId, incarnation).recoveryStorage(storage).build();
      assertEquals(0, authority.exchanges().size());
      client.initialize();
      assertEquals(principalId, client.principals().create("authenticated-account").getPrincipalId());
      SessionBootstrap bootstrap = client.sessions().issue(principalId, deviceId);
      assertEquals("fixture-user-session", bootstrap.getSessionToken());
      assertFalse(bootstrap.toString().contains("fixture-user-session"));
      Conversation conversation = client.conversations().create(conversationInput("Support", principalId));
      assertEquals(conversationId, conversation.getConversationId());

      List<Exchange> exchanges = authority.exchanges();
      assertEquals(Arrays.asList("CommunicationRoute", "CommunicationCreatePrincipal", "CommunicationIssueSession",
          "CommunicationCreateConversation"), operations(authority));
      for (Exchange exchange : exchanges) {
        assertEquals("POST", exchange.method());
        assertEquals("/graphql", exchange.path());
        assertEquals(Collections.singletonList("Bearer " + KEY), exchange.header("authorization"));
        assertEquals(Collections.singletonList("application/json"), exchange.header("content-type"));
        assertEquals(Collections.singletonList("application/json"), exchange.header("accept"));
        assertEquals(projectId, context(exchange.request()).get("projectId"));
        assertEquals(incarnation, context(exchange.request()).get("incarnation"));
      }
      assertFalse(context(exchanges.get(0).request()).containsKey("observedServingEpoch"));
      for (Exchange exchange : exchanges.subList(1, exchanges.size())) {
        assertEquals("2", context(exchange.request()).get("observedServingEpoch"));
      }
      assertEquals(map("principalId", principalId, "deviceId", deviceId, "requestedTtlMs", "900000"),
          input(exchanges.get(2).request()));
      assertEquals(3, client.getRecoveryStates().size());
      for (RecoveryState state : client.getRecoveryStates()) {
        assertEquals(RecoveryState.Resolution.COMMITTED, state.getResolution());
        assertFalse(state.toString().contains("fixture-"));
        assertFalse(Json.stringify(state.getInput()).contains("fixture-"));
      }
      for (Map.Entry<String, String> write : storage.writes()) {
        assertEquals("convohop.requests:backend:" + projectId, write.getKey());
        assertFalse(write.getValue().contains("fixture-"));
      }
    }
  }

  @Test
  void dataPlaneCallsCarryActAsPrincipalIdAndScopeRequiredIsATypedProblem() {
    OperationCatalog catalog = Operations.catalog();
    for (String id : Arrays.asList("communication.sendMessage", "communication.messages", "communication.getMessage",
        "communication.inbox", "communication.search")) {
      assertTrue(operation(catalog, id).inputFields().contains("actAsPrincipalId"), id);
    }
    for (String id : Arrays.asList("communication.editMessage", "communication.deleteMessage")) {
      assertFalse(operation(catalog, id).inputFields().contains("actAsPrincipalId"), id);
    }
    assertNull(catalog.find("communication.events"), "client-layer operations stay out of the server SDK");

    String projectId = id(), incarnation = id(), conversationId = id(), actAs = id();
    try (FakeAuthority authority = new FakeAuthority(exchange -> {
      Map<String, Object> request = exchange.request();
      if (exchange.operationName().equals("CommunicationInbox")) {
        return Response.json(Json.stringify(map("errors", Collections.singletonList(map(
            "message", "The backend key requires the current messageRead scope",
            "extensions", map("code", "SCOPE_REQUIRED", "requestId", requestId(request), "outcome", "rejected",
                "retryable", false, "status", 403L))))));
      }
      return Response.json(reply(request, map("result", map("messageId", id(), "conversationId", conversationId,
          "sequence", "1", "revision", "1", "status", "sent",
          "cursor", map("incarnation", incarnation, "conversationId", conversationId, "sequence", "1")))));
    })) {
      ProjectServerClient client = client(authority, projectId, incarnation).build();
      ServerConversation handle = client.conversation(conversationId);
      assertEquals(conversationId, handle.getConversationId());
      assertEquals(0, authority.exchanges().size());

      String requestId = id();
      MessageAck sent = handle.messages().send("fixture", map(), actAs, requestId);
      assertEquals(conversationId, sent.getConversationId());
      assertEquals(map("conversationId", conversationId, "text", "fixture", "props", map(), "actAsPrincipalId", actAs),
          input(authority.requests().get(0)));
      assertEquals(requestId, requestId(authority.requests().get(0)));
      ConvoHopProblem conflict =
          assertThrows(ConvoHopProblem.class, () -> handle.messages().send("fixture", map(), id(), requestId));
      assertEquals("IDEMPOTENCY_CONFLICT", conflict.getCode());
      assertEquals(requestId, conflict.getRequestId());

      // The generated inputs cannot carry a field the operation lacks; the executor rejects one before sending.
      Transport transport = new Transport(authority.baseUrl(), KEY, projectId, incarnation, "backend:" + projectId,
          null, null, System::currentTimeMillis);
      ConvoHopProblem unknownField = assertThrows(ConvoHopProblem.class, () -> transport.execute(
          Operations.COMMUNICATION_EDIT_MESSAGE, map("conversationId", conversationId, "messageId",
              sent.getMessageId(), "expectedRevision", "1", "text", "fixture", "props", map(), "actAsPrincipalId",
              actAs), null, null));
      assertEquals("INVALID_REQUEST", unknownField.getCode());
      assertEquals("rejected", unknownField.getOutcome());
      assertEquals("Unknown GraphQL input field", unknownField.getMessage());
      assertEquals(0, transport.recoveryStates().size());
      assertEquals(1, authority.exchanges().size());

      ScopeRequiredProblem scope = assertThrows(ScopeRequiredProblem.class,
          () -> client.communication().inbox(InboxRequestInput.builder().limit(10).actAsPrincipalId(actAs).build()));
      assertEquals("SCOPE_REQUIRED", scope.getCode());
      assertEquals("rejected", scope.getOutcome());
      assertEquals(403, scope.getStatus());
      assertEquals("messageRead", scope.getScope());
      assertEquals(requestId(authority.requests().get(1)), scope.getRequestId());
      assertNull(scope.getRetryAfter());
      assertFalse(trace(scope).contains(KEY));
      assertEquals(map("limit", 10L, "actAsPrincipalId", actAs), input(authority.requests().get(1)));
      assertEquals(2, authority.exchanges().size());
    }
  }

  @Test
  void membershipBatchesKeepTheirIdentityAndDecimalRevisions() {
    String projectId = id(), incarnation = id(), conversationId = id(), principalId = id(), requestId = id();
    try (FakeAuthority authority = new FakeAuthority(exchange -> Response.json(reply(exchange.request(),
        map("result", map("items", Collections.singletonList(member(conversationId, principalId)))))))) {
      ServerConversation.Members members = client(authority, projectId, incarnation).build()
          .conversation(conversationId).members();
      MemberBatchEntryInput entry = MemberBatchEntryInput.builder()
          .principalId(principalId).role("member").expectedRevision("9223372036854775807").build();
      List<Member> added = members.addBatch(Collections.singletonList(entry), requestId);
      assertEquals(Boolean.FALSE, added.get(0).getCanStartBroadcast());
      Map<String, Object> request = authority.requests().get(0);
      assertEquals("CommunicationAddMembers", request.get("operationName"));
      assertEquals(requestId, requestId(request));
      assertEquals(map("conversationId", conversationId, "members", Collections.singletonList(
          map("principalId", principalId, "role", "member", "expectedRevision", "9223372036854775807"))),
          input(request));

      List<MemberBatchEntryInput> tooMany = new ArrayList<>();
      for (int index = 0; index < 101; index++) {
        tooMany.add(MemberBatchEntryInput.builder().principalId(id()).role("member").expectedRevision("1").build());
      }
      for (List<MemberBatchEntryInput> invalid : Arrays.asList(
          Collections.<MemberBatchEntryInput>emptyList(), tooMany, Arrays.asList(entry, entry))) {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> members.addBatch(invalid));
        assertTrue(error.getMessage().contains("1..100 distinct"), error.getMessage());
      }
      assertEquals(1, authority.exchanges().size());
    }
  }

  @Test
  void aNewClientRetriesALostMutationWithItsOriginalIdentityAfterKeyRotation() {
    String projectId = id(), incarnation = id(), principalId = id(), requestId = id(), conversationId = id();
    String key = "convohop.requests:backend:" + projectId;
    RecordingStorage storage = new RecordingStorage();
    CreateConversationRequestInput input = conversationInput("original", principalId);
    Map<String, Object> expectedInput = map("title", "original", "props", map(),
        "members", Collections.singletonList(map("principalId", principalId, "role", "member")));

    RecoveryState original;
    try (FakeAuthority lost = new FakeAuthority(exchange -> Response.drop())) {
      ProjectServerClient first = ProjectServerClient.builder().baseUrl(lost.baseUrl()).projectId(projectId)
          .incarnation(incarnation).backendKey("fixture-original-backend").recoveryStorage(storage).build();
      ConvoHopProblem unknown = assertThrows(ConvoHopProblem.class, () -> first.conversations().create(input, requestId));
      assertEquals("TRANSPORT_UNKNOWN", unknown.getCode());
      assertEquals(requestId, unknown.getRequestId());
      assertEquals("unknown", unknown.getOutcome());
      assertEquals(0, unknown.getStatus());
      assertFalse(trace(unknown).contains("fixture-original-backend"));
      assertEquals(1, lost.exchanges().size());
      assertEquals(Collections.singletonList("Bearer fixture-original-backend"),
          lost.exchanges().get(0).header("authorization"));
      original = first.getRecoveryStates().get(0);
    }
    assertEquals(1, original.getAttemptCount());
    assertEquals(RecoveryState.Resolution.UNKNOWN, original.getResolution());
    assertEquals("TRANSPORT_UNKNOWN", original.getLastAttemptClassification());
    assertEquals("communication.createConversation", original.getOperation());
    assertEquals(expectedInput, original.getInput());

    AtomicBoolean committed = new AtomicBoolean();
    AtomicInteger mutations = new AtomicInteger();
    try (FakeAuthority authority = new FakeAuthority(exchange -> {
      Map<String, Object> request = exchange.request();
      switch (exchange.operationName()) {
        case "CommunicationRoute":
          return Response.json(reply(request,
              map("result", route(projectId, incarnation, "2"))));
        case "CommunicationResolveRequest":
          return Response.json(reply(request,
              map("result", resolution(requestId, committed.get() ? "committed" : "notObservedYet"))));
        case "CommunicationCreateConversation":
          mutations.incrementAndGet();
          committed.set(true);
          return created(exchange, conversationId);
        default:
          return Response.status(500, "{}");
      }
    })) {
      ProjectServerClient restarted = ProjectServerClient.builder().baseUrl(authority.baseUrl()).projectId(projectId)
          .incarnation(incarnation).backendKey("fixture-refreshed-backend").recoveryStorage(storage).build();
      assertSameRecord(original, restarted.getRecoveryStates().get(0));
      assertEquals(original.getAttemptCount(), restarted.getRecoveryStates().get(0).getAttemptCount());
      assertEquals(0, authority.exchanges().size());
      restarted.initialize();
      RequestResolution resolved = restarted.requests().retry(requestId);
      assertEquals("committed", resolved.getState());
      assertEquals(requestId, resolved.getRequestId());

      RecoveryState current = restarted.getRecoveryStates().get(0);
      assertSameRecord(original, current);
      assertEquals(2, current.getAttemptCount());
      assertEquals(RecoveryState.Resolution.COMMITTED, current.getResolution());
      assertEquals(1, mutations.get());
      assertEquals(Arrays.asList("CommunicationRoute", "CommunicationResolveRequest",
          "CommunicationCreateConversation", "CommunicationResolveRequest"), operations(authority));
      for (Exchange exchange : authority.exchanges()) {
        Map<String, Object> request = exchange.request();
        assertEquals(Collections.singletonList("Bearer fixture-refreshed-backend"), exchange.header("authorization"));
        assertEquals(projectId, context(request).get("projectId"));
        assertEquals(incarnation, context(request).get("incarnation"));
        if (exchange.operationName().equals("CommunicationResolveRequest")) {
          // Lookups have their own request IDs and name the original one.
          assertNotEquals(requestId, requestId(request));
          assertEquals(map("requestId", requestId), input(request));
        } else if (exchange.operationName().equals("CommunicationCreateConversation")) {
          assertEquals(requestId, requestId(request));
          assertEquals(expectedInput, input(request));
          assertEquals("2", context(request).get("observedServingEpoch"));
        }
      }
    }
    assertEquals(Arrays.asList(key, key), storage.reads());
    assertFalse(storage.writes().isEmpty());
    for (Map.Entry<String, String> write : storage.writes()) {
      assertEquals(key, write.getKey());
      assertFalse(write.getValue().contains("fixture-"));
    }
    assertEquals(0, storage.removals().size());
  }

  @Test
  void aRecoveryStorageFailurePreventsTheRequestAndKeepsItsIdentity() {
    String projectId = id(), incarnation = id(), requestId = id();
    RecordingStorage storage = new RecordingStorage().failWrites();
    try (FakeAuthority authority = new FakeAuthority(exchange -> Response.status(500, "{}"))) {
      ProjectServerClient client = client(authority, projectId, incarnation).recoveryStorage(storage).build();
      ConvoHopProblem failure = assertThrows(ConvoHopProblem.class,
          () -> client.conversations().create(conversationInput("original", id()), requestId));
      assertEquals("RECOVERY_STORAGE_FAILURE", failure.getCode());
      assertEquals(requestId, failure.getRequestId());
      assertEquals("unknown", failure.getOutcome());
      assertInstanceOf(IllegalStateException.class, failure.getCause());
      assertEquals(0, authority.exchanges().size());
      RecoveryState state = client.getRecoveryStates().get(0);
      assertEquals(requestId, state.getRequestId());
      assertEquals(projectId, state.getProjectId());
      assertEquals(incarnation, state.getIncarnation());
      assertEquals(0, state.getAttemptCount());
    }
  }

  @Test
  void aMutationIsSentAtMostThreeTimesWithinOneMinuteOfAMonotonicClock() {
    AtomicLong now = new AtomicLong(1_000_000L);
    CreateConversationRequestInput input = conversationInput("original", id());
    try (FakeAuthority authority = new FakeAuthority(exchange -> Response.drop())) {
      ProjectServerClient client = client(authority, id(), id()).clock(now::get).build();
      String requestId = id();
      for (int attempt = 1; attempt <= 3; attempt++) {
        assertEquals("TRANSPORT_UNKNOWN", assertThrows(ConvoHopProblem.class,
            () -> client.conversations().create(input, requestId)).getCode());
        assertEquals(attempt, client.getRecoveryStates().get(0).getAttemptCount());
        now.addAndGet(1_000L);
      }
      ConvoHopProblem exhausted =
          assertThrows(ConvoHopProblem.class, () -> client.conversations().create(input, requestId));
      assertEquals("RESOLUTION_REQUIRED", exhausted.getCode());
      assertEquals("unknown", exhausted.getOutcome());
      assertEquals(409, exhausted.getStatus());
      assertEquals(3, authority.exchanges().size());
      RecoveryState state = client.getRecoveryStates().get(0);
      assertEquals(Instant.ofEpochMilli(1_000_000L), state.getFirstSubmittedAt());
      assertEquals(Instant.ofEpochMilli(1_060_000L), state.getRetryDeadline());
      assertEquals(Instant.ofEpochMilli(1_002_000L), state.getLastAttemptAt());

      String late = id();
      assertThrows(ConvoHopProblem.class, () -> client.conversations().create(input, late));
      now.addAndGet(60_001L);
      assertEquals("RESOLUTION_REQUIRED", assertThrows(ConvoHopProblem.class,
          () -> client.conversations().create(input, late)).getCode());

      String rewound = id();
      assertThrows(ConvoHopProblem.class, () -> client.conversations().create(input, rewound));
      now.addAndGet(-1L);
      assertEquals("RESOLUTION_REQUIRED", assertThrows(ConvoHopProblem.class,
          () -> client.conversations().create(input, rewound)).getCode());
      assertEquals(5, authority.exchanges().size());
    }
  }

  @Test
  void retryResolvesFirstAndNeverInventsOrRepeatsACommittedRequest() {
    String projectId = id(), incarnation = id();
    AtomicReference<Function<Exchange, Response>> next = new AtomicReference<>(exchange -> Response.drop());
    try (FakeAuthority authority = new FakeAuthority(exchange -> next.get().apply(exchange))) {
      ProjectServerClient client = client(authority, projectId, incarnation).build();
      assertThrows(IllegalStateException.class, () -> client.requests().retry(id()));
      assertThrows(IllegalArgumentException.class, () -> client.requests().retry("not-a-request-id"));
      assertEquals(0, authority.exchanges().size());

      // The authority committed a request whose reply was lost: retry reports it without resending.
      String lost = id();
      assertThrows(ConvoHopProblem.class, () -> client.conversations().create(conversationInput("lost", id()), lost));
      next.set(exchange -> Response.json(reply(exchange.request(), map("result", resolution(lost, "committed")))));
      assertEquals("committed", client.requests().retry(lost).getState());
      assertEquals(Arrays.asList("CommunicationCreateConversation", "CommunicationResolveRequest"),
          operations(authority));
      RecoveryState state = client.getRecoveryStates().get(0);
      assertEquals(1, state.getAttemptCount());
      assertEquals(RecoveryState.Resolution.COMMITTED, state.getResolution());
      assertEquals("authorityReceipt", state.getLastAttemptClassification());

      // A request this client saw commit is never resent because a later lookup lacks evidence.
      String done = id();
      next.set(exchange -> created(exchange, id()));
      client.conversations().create(conversationInput("done", id()), done);
      next.set(exchange -> Response.json(reply(exchange.request(), map("result", resolution(done, "notObservedYet")))));
      ConvoHopProblem required = assertThrows(ConvoHopProblem.class, () -> client.requests().retry(done));
      assertEquals("RESOLUTION_REQUIRED", required.getCode());
      assertEquals(4, authority.exchanges().size());

      next.set(exchange -> Response.json(reply(exchange.request(), map("result", resolution(done, "expired")))));
      assertEquals("Unknown request resolution state", assertThrows(ConvoHopProblem.class,
          () -> client.requests().retry(done)).getMessage());

      String other = id();
      next.set(exchange -> Response.json(reply(exchange.request(), map("result", resolution(other, "committed")))));
      ConvoHopProblem changed = assertThrows(ConvoHopProblem.class, () -> client.requests().resolve(done));
      assertEquals("INVALID_RESPONSE", changed.getCode());
      assertEquals("Request resolution identity changed", changed.getMessage());

      next.set(exchange -> Response.json(reply(exchange.request(), map("result", null))));
      assertEquals("Missing current authority result", assertThrows(ConvoHopProblem.class,
          () -> client.requests().resolve(done)).getMessage());
    }
  }

  @Test
  void concurrentCallsWithOneRequestIdShareOneSubmission() throws Exception {
    String conversationId = id(), requestId = id();
    CountDownLatch entered = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    try (FakeAuthority authority = new FakeAuthority(exchange -> {
      entered.countDown();
      try {
        if (!release.await(10, TimeUnit.SECONDS)) {
          return Response.drop();
        }
      } catch (InterruptedException error) {
        Thread.currentThread().interrupt();
        return Response.drop();
      }
      return created(exchange, conversationId);
    })) {
      ProjectServerClient client = client(authority, id(), id()).build();
      CreateConversationRequestInput input = conversationInput("original", id());
      AtomicReference<@Nullable Object> firstResult = new AtomicReference<>();
      AtomicReference<@Nullable Object> secondResult = new AtomicReference<>();
      Thread first = new Thread(() -> firstResult.set(outcome(() -> client.conversations().create(input, requestId))));
      Thread second = new Thread(() -> secondResult.set(outcome(() -> client.conversations().create(input, requestId))));
      try {
        first.start();
        assertTrue(entered.await(10, TimeUnit.SECONDS));
        second.start();
        // The second call parks on the first call's work instead of sending.
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (second.getState() != Thread.State.WAITING) {
          assertTrue(System.nanoTime() < deadline, "the second call never joined the first");
          Thread.sleep(5);
        }
        ConvoHopProblem conflict = assertThrows(ConvoHopProblem.class,
            () -> client.conversations().create(conversationInput("changed", id()), requestId));
        assertEquals("IDEMPOTENCY_CONFLICT", conflict.getCode());
      } finally {
        release.countDown();
      }
      first.join(TimeUnit.SECONDS.toMillis(10));
      second.join(TimeUnit.SECONDS.toMillis(10));
      assertEquals(conversationId, assertInstanceOf(Conversation.class, firstResult.get()).getConversationId());
      assertEquals(conversationId, assertInstanceOf(Conversation.class, secondResult.get()).getConversationId());
      assertEquals(1, authority.exchanges().size());
      assertEquals(1, client.getRecoveryStates().get(0).getAttemptCount());
    }
  }

  @Test
  void retryDelaysComeFromTheErrorExtensionThenTheBodyThenTheHeader() {
    AtomicReference<Function<Exchange, Response>> next = new AtomicReference<>();
    try (FakeAuthority authority = new FakeAuthority(exchange -> next.get().apply(exchange))) {
      ProjectServerClient client = client(authority, id(), id()).build();
      Object[][] cases = {
        // extensions.retryAfter, Retry-After header, expected seconds
        {7L, null, 7L}, {"3", "9", 3L}, {null, "9", 9L}, {"0", null, 0L}, {1.5, "4", 4L}, {1.5, null, null},
        {-1L, null, null}, {"12345678901", null, null}, {"1e3", null, null}, {"", null, null}, {true, null, null},
        {9007199254740992.0, null, null}, {null, "Wed, 21 Oct 2015 07:28:00 GMT", null}, {null, "-1", null},
        {null, "12345678901", null},
      };
      for (Object[] item : cases) {
        Object extension = item[0];
        Object header = item[1];
        Object expected = item[2];
        next.set(exchange -> {
          Map<String, Object> extensions = map("code", "RATE_LIMITED", "requestId", requestId(exchange.request()),
              "outcome", "rejected", "retryable", true, "status", 429L);
          if (extension != null) {
            extensions.put("retryAfter", extension);
          }
          Response response = Response.json(Json.stringify(map("errors", Collections.singletonList(
              map("message", "Slow down", "extensions", extensions)))));
          return header == null ? response : response.header("retry-after", (String) header);
        });
        ConvoHopProblem problem = assertThrows(ConvoHopProblem.class, client::capabilities);
        String label = Arrays.toString(item);
        assertEquals("RATE_LIMITED", problem.getCode(), label);
        assertEquals("rejected", problem.getOutcome(), label);
        assertEquals(429, problem.getStatus(), label);
        assertEquals("Slow down", problem.getMessage(), label);
        assertEquals(expected == null ? null : Duration.ofSeconds((Long) expected), problem.getRetryAfter(), label);
      }

      next.set(exchange -> Response.status(429, Json.stringify(map("code", "RATE_LIMITED", "outcome", "rejected",
          "message", "Too many requests", "retryAfter", 5L))).header("retry-after", "8"));
      ConvoHopProblem body = assertThrows(ConvoHopProblem.class, client::capabilities);
      assertEquals(Arrays.asList("RATE_LIMITED", "rejected", 429, "Too many requests", Duration.ofSeconds(5)),
          Arrays.asList(body.getCode(), body.getOutcome(), body.getStatus(), body.getMessage(), body.getRetryAfter()));

      next.set(exchange -> Response.status(503, "{}").header("Retry-After", "11"));
      ConvoHopProblem header = assertThrows(ConvoHopProblem.class, client::capabilities);
      assertEquals(Arrays.asList("HTTP_FAILURE", "unknown", 503, "Authority rejected the request", Duration.ofSeconds(11)),
          Arrays.asList(header.getCode(), header.getOutcome(), header.getStatus(), header.getMessage(),
              header.getRetryAfter()));

      next.set(exchange -> Response.json("{\"errors\":[{\"message\":\"boom\"}]}"));
      ConvoHopProblem bare = assertThrows(ConvoHopProblem.class, client::capabilities);
      assertEquals(Arrays.asList("GRAPHQL_ERROR", "unknown", 503, "boom"),
          Arrays.asList(bare.getCode(), bare.getOutcome(), bare.getStatus(), bare.getMessage()));

      next.set(exchange -> Response.status(502, "<html>bad gateway</html>"));
      ConvoHopProblem html = assertThrows(ConvoHopProblem.class, client::capabilities);
      assertEquals(Arrays.asList("INVALID_RESPONSE", "unknown", 502, "Unrecognized authority response"),
          Arrays.asList(html.getCode(), html.getOutcome(), html.getStatus(), html.getMessage()));
    }
  }

  @Test
  void malformedOrMismatchedRepliesAreInvalidResponses() {
    String projectId = id(), incarnation = id(), principalId = id(), deviceId = id(), conversationId = id();
    Map<String, Object> route = route(projectId, incarnation, "2");
    AtomicReference<Function<Exchange, Response>> next = new AtomicReference<>();
    try (FakeAuthority authority = new FakeAuthority(exchange -> next.get().apply(exchange))) {
      ProjectServerClient client = client(authority, projectId, incarnation).build();
      Executable initialize = client::initialize;
      invalid(next, exchange -> Response.json("not json"), initialize, "Unrecognized authority response");
      invalid(next, exchange -> Response.json("{}"), initialize, MALFORMED);
      invalid(next, exchange -> Response.json("[]"), initialize, MALFORMED);
      invalid(next, exchange -> Response.json("{\"data\":{\"route\":null}}"), initialize, MALFORMED);
      invalid(next, exchange -> Response.json(reply(exchange.request(), map("requestId", id(), "result", route))),
          initialize, "Mismatched authority request identity");
      invalid(next, exchange -> Response.json(reply(exchange.request(), map("requestId", "not-a-request-id"))),
          initialize, MALFORMED);
      invalid(next, exchange -> Response.json(reply(exchange.request(), map("status", "weird", "result", route))),
          initialize, MALFORMED);
      invalid(next, exchange -> Response.json(reply(exchange.request(), map("result", null))), initialize,
          "Missing current authority result");
      // A route is a signed proof: the IR requires its signature.
      invalid(next, exchange -> Response.json(reply(exchange.request(), map("result",
          map("projectId", projectId, "incarnation", incarnation, "servingEpoch", "2")))), initialize, MALFORMED);
      invalid(next, exchange -> Response.json(reply(exchange.request(), map("result",
          route(projectId, incarnation, 2L)))), initialize,
          "Invalid project route");
      String padded = "{\"pad\":\"" + repeat('a', 1_048_577) + "\"}";
      invalid(next, exchange -> Response.json(padded), initialize, "Authority response exceeds the bound");
      String streamed = "{\"pad\":\"" + repeat('a', 3 * 1_048_576 + 16) + "\"}";
      invalid(next, exchange -> Response.json(streamed), initialize, "Authority response exceeds the bound");

      for (Map<String, Object> moved : Arrays.asList(
          route(projectId, id(), "2"),
          route(id(), incarnation, "2"))) {
        next.set(exchange -> Response.json(reply(exchange.request(), map("result", moved))));
        assertEquals("Project incarnation changed; explicit recovery required",
            assertThrows(IllegalStateException.class, client::initialize).getMessage());
      }
      next.set(exchange -> Response.json("\uFEFF" + reply(exchange.request(), map("result", route))));
      client.initialize();

      // Mutation replies need receipt evidence; the record stays unknown when it is missing.
      int records = 0;
      for (Map<String, Object> receipt : Arrays.asList(map("receiptId", null), map("receiptId", "not-a-receipt"),
          map("committedAt", "2030-01-01T00:00:00Z"), map("committedAt", "2030-02-30T00:00:00.000Z"),
          map("replayed", null), map("status", "accepted", "operation", null), map("status", "ok"))) {
        next.set(exchange -> {
          Map<String, Object> fields = new LinkedHashMap<>(receipt);
          fields.put("result", full("Conversation", map("conversationId", conversationId, "revision", "1",
              "title", "original", "latestSequence", "1")));
          return Response.json(reply(exchange.request(), fields));
        });
        String requestId = id();
        ConvoHopProblem problem = invalid(next, next.get(),
            () -> client.conversations().create(conversationInput("original", id()), requestId), MALFORMED);
        assertEquals(requestId, problem.getRequestId(), receipt.toString());
        RecoveryState state = client.getRecoveryStates().get(records++);
        assertEquals(requestId, state.getRequestId());
        assertEquals(RecoveryState.Resolution.UNKNOWN, state.getResolution(), receipt.toString());
        assertEquals("INVALID_RESPONSE", state.getLastAttemptClassification());
      }

      // Helpers check that results name what the request did.
      next.set(exchange -> Response.json(reply(exchange.request(), map("result", map("principalId", principalId,
          "externalUserId", "another-account", "status", "active", "revision", "1")))));
      invalid(next, next.get(), () -> client.principals().create("authenticated-account"),
          "Principal does not match the request");
      next.set(exchange -> Response.json(reply(exchange.request(), map("result", map("session", map(
          "sessionId", id(), "principalId", principalId, "deviceId", id(), "incarnation", incarnation,
          "sessionRevision", "1", "expiresAt", "2030-01-01T00:00:00.000Z", "status", "active"),
          "sessionToken", "fixture-user-session", "tokenExpiresAt", "2030-01-01T00:00:00.000Z")))));
      ConvoHopProblem session = invalid(next, next.get(), () -> client.sessions().issue(principalId, deviceId),
          "Session does not match the request");
      assertFalse(trace(session).contains("fixture-user-session"));
      next.set(exchange -> Response.json(reply(exchange.request(), map("result", map("messageId", id(),
          "conversationId", conversationId, "sequence", "1", "revision", "1", "status", "sent",
          "cursor", map("incarnation", id(), "conversationId", conversationId, "sequence", "1"))))));
      invalid(next, next.get(), () -> client.conversation(conversationId).messages().send("hello"),
          "Invalid send receipt scope");
    }
  }

  @Test
  void redirectsAreNeverFollowedAndLeaveTheOutcomeUnknown() {
    AtomicReference<Function<Exchange, Response>> next = new AtomicReference<>(
        exchange -> Response.status(307, "").header("location", "https://elsewhere.example.com/graphql"));
    try (FakeAuthority authority = new FakeAuthority(exchange -> next.get().apply(exchange))) {
      ProjectServerClient client = client(authority, id(), id()).build();
      for (int round = 0; round < 2; round++) {
        ConvoHopProblem lost = assertThrows(ConvoHopProblem.class, client::initialize);
        assertEquals("TRANSPORT_UNKNOWN", lost.getCode());
        assertEquals("unknown", lost.getOutcome());
        assertEquals(0, lost.getStatus());
        assertEquals("Authority response unavailable; resolve the original request", lost.getMessage());
        assertEquals(round + 1, authority.exchanges().size());
        next.set(exchange -> Response.status(302, "{\"data\":{}}").header("location", "/elsewhere"));
      }
    }
  }

  @Test
  void originsAreHttpsOrExplicitLoopbackHttp() {
    String[][] accepted = {
      {"https://api.example.com", "https://api.example.com"},
      {"https://api.example.com/", "https://api.example.com"},
      {"HTTPS://API.Example.com:443", "https://api.example.com"},
      {"https://api.example.com:8443", "https://api.example.com:8443"},
      {"http://localhost:18080", "http://localhost:18080"},
      {"http://127.0.0.1:80", "http://127.0.0.1"},
      {"http://[::1]:18080/", "http://[::1]:18080"},
    };
    for (String[] item : accepted) {
      assertEquals(item[1], Transport.origin(item[0]), item[0]);
    }
    for (String rejected : Arrays.asList("http://api.example.com", "http://127.0.0.2", "http://localhost.example.com",
        "https://user@api.example.com", "https://user:secret@api.example.com", "https://api.example.com/api",
        "https://api.example.com/graphql", "https://api.example.com?region=1", "https://api.example.com#top",
        "ftp://api.example.com", "api.example.com", "//api.example.com", "https://", "https://api example.com", "")) {
      IllegalArgumentException error =
          assertThrows(IllegalArgumentException.class, () -> Transport.origin(rejected), rejected);
      assertEquals("Use an HTTPS origin, or explicit loopback HTTP for local development", error.getMessage());
    }
  }

  @Test
  void buildersRequireEverySettingAndRejectInvalidOnes() {
    String projectId = id(), incarnation = id();
    Supplier<ProjectServerClient.Builder> complete = () -> ProjectServerClient.builder()
        .baseUrl("https://api.example.com").projectId(projectId).incarnation(incarnation).backendKey(KEY);
    ProjectServerClient client = complete.get().build();
    assertEquals(projectId, client.getProjectId());
    assertEquals(incarnation, client.getIncarnation());
    assertEquals(0, client.getRecoveryStates().size());

    assertEquals("baseUrl is required", assertThrows(IllegalStateException.class, () -> ProjectServerClient.builder()
        .projectId(projectId).incarnation(incarnation).backendKey(KEY).build()).getMessage());
    assertEquals("projectId is required", assertThrows(IllegalStateException.class, () -> ProjectServerClient.builder()
        .baseUrl("https://api.example.com").incarnation(incarnation).backendKey(KEY).build()).getMessage());
    assertEquals("incarnation is required", assertThrows(IllegalStateException.class, () -> ProjectServerClient
        .builder().baseUrl("https://api.example.com").projectId(projectId).backendKey(KEY).build()).getMessage());
    assertEquals("backendKey is required", assertThrows(IllegalStateException.class, () -> ProjectServerClient
        .builder().baseUrl("https://api.example.com").projectId(projectId).incarnation(incarnation).build())
        .getMessage());

    for (String bad : Arrays.asList("not-a-uuid", "0F8FAD5B-D9CB-469F-A165-70867728950E",
        "00000000-0000-0000-0000-000000000000", "{" + projectId + "}", projectId + " ")) {
      assertThrows(IllegalArgumentException.class, () -> complete.get().projectId(bad).build(), bad);
      assertThrows(IllegalArgumentException.class, () -> complete.get().incarnation(bad).build(), bad);
    }
    for (String bad : Arrays.asList("", "fixture key", "fixture\tkey", "fixture-ключ", "fixture\nkey")) {
      IllegalArgumentException error =
          assertThrows(IllegalArgumentException.class, () -> complete.get().backendKey(bad).build());
      assertFalse(!bad.isEmpty() && trace(error).contains(bad), bad);
    }
    assertThrows(IllegalArgumentException.class, () -> complete.get().baseUrl("http://api.example.com").build());
    HttpClient following = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NORMAL).build();
    assertEquals("The HTTP client must not follow redirects",
        assertThrows(IllegalArgumentException.class, () -> complete.get().httpClient(following).build()).getMessage());
    complete.get().httpClient(HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build()).build();
    assertThrows(NullPointerException.class, () -> ProjectServerClient.builder().backendKey(null));

    assertThrows(IllegalArgumentException.class, () -> client.conversation("not-a-conversation"));
    assertThrows(IllegalArgumentException.class, () -> client.requests().resolve("not-a-request"));
    assertThrows(IllegalArgumentException.class, () -> client.operation("not-an-operation"));
  }

  @Test
  void malformedStoredRecordsFailTheBuildBeforeAnyRequest() {
    String projectId = id(), incarnation = id(), key = "convohop.requests:backend:" + projectId;
    RecordingStorage storage = new RecordingStorage();
    try (FakeAuthority authority = new FakeAuthority(exchange -> created(exchange, id()))) {
      client(authority, projectId, incarnation).recoveryStorage(storage).build()
          .conversations().create(conversationInput("original", id()));
      String saved = Objects.requireNonNull(storage.value(key));
      Map<String, Object> record = Repo.object(Repo.list(Json.parse(saved)).get(0));

      List<String> invalid = new ArrayList<>(Arrays.asList("not json", "{}", "[1]", "[null]", "[{}]"));
      invalid.add(Json.stringify(Arrays.asList(record, record)));
      invalid.add(Json.stringify(Collections.nCopies(129, record)));
      Object[][] changes = {
        {"operation", "communication.route"}, {"operation", "communication.unknown"}, {"operation", null},
        {"resolutionState", "weird"}, {"attemptCount", -1L}, {"attemptCount", 1.5}, {"attemptCount", "1"},
        {"retryDeadline", 9007199254740992.0}, {"mediaAdmissionAttempted", false},
        {"requestId", "00000000-0000-0000-0000-000000000000"}, {"projectId", "not-a-project"},
        {"projectId", null}, {"input", "text"}, {"incarnation", 1L}, {"payloadFingerprint", null},
        {"lastAttemptClassification", null},
      };
      for (Object[] change : changes) {
        Map<String, Object> changed = new LinkedHashMap<>(record);
        changed.put((String) change[0], change[1]);
        invalid.add(Json.stringify(Collections.singletonList(changed)));
      }
      Map<String, Object> unscoped = new LinkedHashMap<>(record);
      unscoped.remove("projectId");
      invalid.add(Json.stringify(Collections.singletonList(unscoped)));

      for (String value : invalid) {
        ProjectServerClient.Builder builder =
            client(authority, projectId, incarnation).recoveryStorage(new RecordingStorage().put(key, value));
        assertThrows(IllegalArgumentException.class, builder::build, value);
      }
      assertEquals(1, authority.exchanges().size());
      ProjectServerClient restored =
          client(authority, projectId, incarnation).recoveryStorage(new RecordingStorage().put(key, saved)).build();
      assertEquals(record.get("requestId"), restored.getRecoveryStates().get(0).getRequestId());
      assertEquals(RecoveryState.Resolution.COMMITTED, restored.getRecoveryStates().get(0).getResolution());
    }
  }

  private static String id() {
    return UUID.randomUUID().toString();
  }

  private static ProjectServerClient.Builder client(FakeAuthority authority, String projectId, String incarnation) {
    return ProjectServerClient.builder()
        .baseUrl(authority.baseUrl())
        .projectId(projectId)
        .incarnation(incarnation)
        .backendKey(KEY);
  }

  private static CreateConversationRequestInput conversationInput(String title, String principalId) {
    return CreateConversationRequestInput.builder()
        .title(title)
        .props(Collections.emptyMap())
        .members(Collections.singletonList(MemberInputInput.builder().principalId(principalId).role("member").build()))
        .build();
  }

  private static Response created(Exchange exchange, String conversationId) {
    return Response.json(reply(exchange.request(), map("result", full("Conversation", map("conversationId",
        conversationId, "revision", "1", "title", "original", "props", map(), "latestSequence", "1")))));
  }

  private static Map<String, Object> route(String projectId, String incarnation, Object servingEpoch) {
    return map("projectId", projectId, "incarnation", incarnation, "servingEpoch", servingEpoch,
        "signature", "route-proof");
  }

  private static Map<String, Object> member(String conversationId, String principalId) {
    return map("conversationId", conversationId, "principalId", principalId, "role", "member", "status", "active",
        "membershipEpoch", "1", "visibilityEpoch", "1", "revision", "1", "visibleFromSequence", "1",
        "canStartBroadcast", false);
  }

  private static OperationDescriptor<?> operation(OperationCatalog catalog, String id) {
    return Objects.requireNonNull(catalog.find(id), id);
  }

  private static List<String> operations(FakeAuthority authority) {
    List<String> names = new ArrayList<>();
    for (Exchange exchange : authority.exchanges()) {
      names.add(exchange.operationName());
    }
    return names;
  }

  private static ConvoHopProblem invalid(
      AtomicReference<Function<Exchange, Response>> next, Function<Exchange, Response> reply, Executable call,
      String message) {
    next.set(reply);
    ConvoHopProblem problem = assertThrows(ConvoHopProblem.class, call, message);
    assertEquals("INVALID_RESPONSE", problem.getCode(), message);
    assertEquals("unknown", problem.getOutcome(), message);
    assertEquals(message, problem.getMessage());
    assertFalse(trace(problem).contains(KEY));
    return problem;
  }

  private static void assertSameRecord(RecoveryState expected, RecoveryState actual) {
    assertEquals(expected.getRequestId(), actual.getRequestId());
    assertEquals(expected.getIncarnation(), actual.getIncarnation());
    assertEquals(expected.getPayloadFingerprint(), actual.getPayloadFingerprint());
    assertEquals(expected.getOperation(), actual.getOperation());
    assertEquals(expected.getProjectId(), actual.getProjectId());
    assertEquals(expected.getInput(), actual.getInput());
    assertEquals(expected.getFirstSubmittedAt(), actual.getFirstSubmittedAt());
    assertEquals(expected.getRetryDeadline(), actual.getRetryDeadline());
  }

  private static @Nullable Object outcome(Supplier<?> call) {
    try {
      return call.get();
    } catch (RuntimeException error) {
      return error;
    }
  }

  private static String trace(Throwable error) {
    StringWriter out = new StringWriter();
    error.printStackTrace(new PrintWriter(out));
    return out.toString();
  }

  private static String repeat(char value, int count) {
    char[] chars = new char[count];
    Arrays.fill(chars, value);
    return new String(chars);
  }
}
