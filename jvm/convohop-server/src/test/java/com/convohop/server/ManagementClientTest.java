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
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.convohop.server.api.Operations;
import com.convohop.server.model.IssueBackendKeyReply;
import com.convohop.server.model.ProjectUsage;
import com.convohop.server.model.ProjectUsageRequestInput;
import com.convohop.server.model.UsageMeter;
import com.convohop.server.testing.FakeAuthority;
import com.convohop.server.testing.FakeAuthority.Exchange;
import com.convohop.server.testing.FakeAuthority.Response;
import com.convohop.server.testing.RecordingStorage;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

/** Ports the management tests in {@code packages/server/test/server.test.mjs}. */
class ManagementClientTest {
  private static final String TOKEN = "fixture-operator";

  @Test
  void backendKeyIssuanceIsAnAcceptedOperationJournaledForTheActor() {
    String actorId = id(), projectId = id(), operationId = id(), expiresAt = "2030-01-01T00:00:00.000Z";
    RecordingStorage storage = new RecordingStorage();
    try (FakeAuthority authority = new FakeAuthority(exchange -> Response.json(reply(exchange.request(), map(
        "status", "accepted",
        "operation", map("operationId", operationId, "owner", "management", "href", "/graphql", "state", "requested"),
        "resourceRef", map("kind", "project", "id", projectId)))))) {
      ManagementClient client = client(authority, actorId).recoveryStorage(storage).build();
      IssueBackendKeyReply issued =
          client.issueBackendKey(projectId, "backend", Collections.singletonList("membershipManage"), expiresAt);
      assertEquals("accepted", issued.getStatus());
      assertEquals(operationId, Objects.requireNonNull(issued.getOperation()).getOperationId());
      assertNull(issued.getResult());

      Exchange exchange = authority.exchanges().get(0);
      assertEquals("ManagementIssueBackendKey", exchange.operationName());
      assertEquals(Collections.singletonList("Bearer " + TOKEN), exchange.header("authorization"));
      // Management requests name no project, incarnation or serving epoch; the project is an input.
      assertEquals(Collections.singleton("requestId"), context(exchange.request()).keySet());
      assertEquals(map("projectId", projectId, "name", "backend", "scopes",
          Collections.singletonList("membershipManage"), "expiresAt", expiresAt), input(exchange.request()));

      RecoveryState state = client.getRecoveryStates().get(0);
      assertEquals(requestId(exchange.request()), state.getRequestId());
      assertEquals("management.issueBackendKey", state.getOperation());
      assertNull(state.getProjectId());
      assertEquals("management", state.getIncarnation());
      assertEquals(RecoveryState.Resolution.ACCEPTED, state.getResolution());
      assertEquals("authorityReceipt", state.getLastAttemptClassification());

      String key = "convohop.requests:management:" + actorId;
      assertEquals(Collections.singletonList(key), storage.reads());
      assertFalse(storage.writes().isEmpty());
      for (Map.Entry<String, String> write : storage.writes()) {
        assertEquals(key, write.getKey());
        assertFalse(write.getValue().contains(TOKEN));
      }
    }
  }

  @Test
  void aLostManagementMutationIsResolvedAndRetriedOnTheManagementPlane() {
    String actorId = id(), projectId = id(), requestId = id(), key = "convohop.requests:management:" + actorId;
    RecordingStorage storage = new RecordingStorage();
    AtomicBoolean resent = new AtomicBoolean();
    AtomicReference<Function<Exchange, Response>> next = new AtomicReference<>(exchange -> Response.drop());
    try (FakeAuthority authority = new FakeAuthority(exchange -> next.get().apply(exchange))) {
      ManagementClient client = client(authority, actorId).recoveryStorage(storage).build();
      ConvoHopProblem lost = assertThrows(ConvoHopProblem.class, () -> client.issueBackendKey(
          projectId, "backend", Collections.singletonList("membershipManage"), "2030-01-01T00:00:00.000Z", requestId));
      assertEquals("TRANSPORT_UNKNOWN", lost.getCode());

      ManagementClient restarted = ManagementClient.builder().baseUrl(authority.baseUrl()).actorId(actorId)
          .accessToken("fixture-rotated-operator").recoveryStorage(storage).build();
      assertEquals(requestId, restarted.getRecoveryStates().get(0).getRequestId());
      next.set(exchange -> {
        if (exchange.operationName().equals("ManagementResolveRequest")) {
          return Response.json(reply(exchange.request(),
              map("result", resolution(requestId, resent.get() ? "accepted" : "notObservedYet"))));
        }
        resent.set(true);
        return Response.json(reply(exchange.request(), map("status", "accepted", "operation",
            map("operationId", id(), "owner", "management", "href", "/graphql", "state", "requested"))));
      });
      assertEquals("accepted", restarted.requests().retry(requestId).getState());

      // The lost attempt, then the retry: a lookup, one resend with the original identity, and a lookup.
      assertEquals(Arrays.asList("ManagementIssueBackendKey", "ManagementResolveRequest", "ManagementIssueBackendKey",
          "ManagementResolveRequest"), operations(authority));
      List<Exchange> exchanges = authority.exchanges();
      assertEquals(requestId, requestId(exchanges.get(2).request()));
      assertEquals(input(exchanges.get(0).request()), input(exchanges.get(2).request()));
      for (Exchange exchange : exchanges.subList(1, exchanges.size())) {
        assertEquals(Collections.singletonList("Bearer fixture-rotated-operator"), exchange.header("authorization"));
        assertEquals(Collections.singleton("requestId"), context(exchange.request()).keySet());
      }
      RecoveryState state = restarted.getRecoveryStates().get(0);
      assertEquals(2, state.getAttemptCount());
      assertEquals(RecoveryState.Resolution.ACCEPTED, state.getResolution());
    }
    assertEquals(Arrays.asList(key, key), storage.reads());
    for (Map.Entry<String, String> write : storage.writes()) {
      assertEquals(key, write.getKey());
      assertFalse(write.getValue().contains("fixture-"));
    }
  }

  @Test
  void usageQuantitiesStayDecimalStringsAndMalformedOnesAreRejected() {
    String projectId = id(), to = "2026-10-01T05:00:00.000Z";
    AtomicReference<Object> quantity = new AtomicReference<>("9223372036854775807");
    try (FakeAuthority authority = new FakeAuthority(exchange -> Response.json(reply(exchange.request(),
        map("result", full("ProjectUsage", map("projectId", projectId, "source", "usage-rollup", "observedAt", to,
            "complete", false, "reason", "Usage aggregation has not reported yet", "from", "2026-10-01T00:00:00.000Z",
            "to", to, "meters", Arrays.asList(
                full("UsageMeter", map("meter", "api_calls", "unit", "call", "quantity", quantity.get(),
                    "emitted", true)),
                full("UsageMeter", map("meter", "egress_gb", "unit", "byte", "quantity", "0", "emitted", false))))))))))
    {
      ManagementClient client = client(authority, id()).build();
      ProjectUsageRequestInput request = ProjectUsageRequestInput.builder().projectId(projectId).build();
      ProjectUsage usage = Objects.requireNonNull(client.management().projectUsage(request).getResult());
      assertEquals(projectId, usage.getProjectId());
      assertNull(usage.getAggregatedThrough());
      List<String> quantities = new ArrayList<>();
      for (UsageMeter meter : usage.getMeters()) {
        quantities.add(meter.getQuantity());
      }
      assertEquals(Arrays.asList("9223372036854775807", "0"), quantities);
      assertEquals(map("projectId", projectId), input(authority.requests().get(0)));
      assertFalse(context(authority.requests().get(0)).containsKey("projectId"));

      for (Object malformed : Arrays.<Object>asList(5L, "-1", "1.5", "01", "9223372036854775808", "")) {
        quantity.set(malformed);
        ConvoHopProblem problem =
            assertThrows(ConvoHopProblem.class, () -> client.management().projectUsage(request), malformed.toString());
        assertEquals("INVALID_RESPONSE", problem.getCode(), malformed.toString());
      }
      assertEquals(7, authority.exchanges().size());
    }
  }

  @Test
  void requestLookupsUseTheManagementPlane() {
    String requestId = id();
    try (FakeAuthority authority = new FakeAuthority(
        exchange -> Response.json(reply(exchange.request(), map("result", resolution(requestId, "notObservedYet")))))) {
      ManagementClient client = client(authority, id()).build();
      assertEquals("notObservedYet", client.requests().resolve(requestId).getState());
      Map<String, Object> request = authority.requests().get(0);
      assertEquals("ManagementResolveRequest", request.get("operationName"));
      assertEquals(map("requestId", requestId), input(request));
      assertNotEquals(requestId, requestId(request));
      assertEquals(Collections.singleton("requestId"), context(request).keySet());
      assertEquals(0, client.getRecoveryStates().size());
    }
  }

  @Test
  void operationsStayOnTheirOwnPlane() {
    String projectId = id();
    Transport management =
        new Transport("https://api.example.com", TOKEN, null, "management", "management:" + id(), null, null,
            System::currentTimeMillis);
    ConvoHopProblem communication = assertThrows(ConvoHopProblem.class, () -> management.execute(
        Operations.COMMUNICATION_CAPABILITIES, null, null, null));
    assertEquals("INVALID_REQUEST", communication.getCode());
    assertEquals("Communication operations require an explicit project", communication.getMessage());

    Transport backend = new Transport("https://api.example.com", TOKEN, projectId, id(), "backend:" + projectId, null,
        null, System::currentTimeMillis);
    ConvoHopProblem selected = assertThrows(ConvoHopProblem.class, () -> backend.execute(
        Operations.MANAGEMENT_CAPABILITIES, null, null, null));
    assertEquals("INVALID_REQUEST", selected.getCode());
    assertEquals("Management project selection belongs in the generated operation input", selected.getMessage());
  }

  @Test
  void buildersRequireEverySettingAndRejectInvalidOnes() {
    String actorId = id();
    assertEquals("actorId is required", assertThrows(IllegalStateException.class,
        () -> ManagementClient.builder().baseUrl("https://api.example.com").accessToken(TOKEN).build()).getMessage());
    assertEquals("baseUrl is required", assertThrows(IllegalStateException.class,
        () -> ManagementClient.builder().actorId(actorId).accessToken(TOKEN).build()).getMessage());
    assertEquals("accessToken is required", assertThrows(IllegalStateException.class,
        () -> ManagementClient.builder().baseUrl("https://api.example.com").actorId(actorId).build()).getMessage());
    for (String bad : Arrays.asList("not-a-uuid", actorId.toUpperCase(Locale.ROOT),
        "00000000-0000-0000-0000-000000000000")) {
      assertThrows(IllegalArgumentException.class, () -> ManagementClient.builder().baseUrl("https://api.example.com")
          .actorId(bad).accessToken(TOKEN).build(), bad);
    }
    assertThrows(IllegalArgumentException.class, () -> ManagementClient.builder().baseUrl("https://api.example.com")
        .actorId(actorId).accessToken("fixture operator").build());
    assertThrows(IllegalArgumentException.class, () -> ManagementClient.builder().baseUrl("http://api.example.com")
        .actorId(actorId).accessToken(TOKEN).build());
    assertThrows(NullPointerException.class, () -> ManagementClient.builder().accessToken(null));

    ManagementClient client =
        ManagementClient.builder().baseUrl("https://api.example.com").actorId(actorId).accessToken(TOKEN).build();
    assertThrows(IllegalArgumentException.class, () -> client.issueBackendKey(
        "not-a-project", "backend", Collections.singletonList("membershipManage"), "2030-01-01T00:00:00.000Z"));
    assertEquals(0, client.getRecoveryStates().size());
  }

  private static String id() {
    return UUID.randomUUID().toString();
  }

  private static ManagementClient.Builder client(FakeAuthority authority, String actorId) {
    return ManagementClient.builder().baseUrl(authority.baseUrl()).actorId(actorId).accessToken(TOKEN);
  }

  private static List<String> operations(FakeAuthority authority) {
    List<String> names = new ArrayList<>();
    for (Exchange exchange : authority.exchanges()) {
      names.add(exchange.operationName());
    }
    return names;
  }
}
