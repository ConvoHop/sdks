package com.convohop.server;

import static com.convohop.server.testing.Fixtures.full;
import static com.convohop.server.testing.Fixtures.input;
import static com.convohop.server.testing.Fixtures.map;
import static com.convohop.server.testing.Fixtures.reply;
import static com.convohop.server.testing.Fixtures.requestId;
import static com.convohop.server.testing.Fixtures.resolution;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.convohop.server.internal.Json;
import com.convohop.server.model.CreateOrganizationReply;
import com.convohop.server.model.CreateOrganizationRequestInput;
import com.convohop.server.testing.FakeAuthority;
import com.convohop.server.testing.FakeAuthority.Exchange;
import com.convohop.server.testing.FakeAuthority.Response;
import com.convohop.server.testing.RecordingStorage;
import com.convohop.server.testing.Repo;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Queue;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * The bounded recovery journal from {@code spec/recovery/README.md}: a full journal forgets the final record attempted
 * longest ago, and refuses a new request before sending it when no record is final. Ported from the .NET SDK's
 * {@code RecoveryJournalTests.cs}.
 */
class RecoveryJournalTest {
  private static final long WINDOW = 60_000L;
  private static final String UNAVAILABLE = "Authority response unavailable; resolve the original request";
  private static final String LIMIT =
      "Recovery storage already holds 128 requests that aren't final; retry or resolve them first";
  // The TypeScript SDK's fingerprint of createOrganization with the input Original/fixture.
  private static final String ORGANIZATION_FINGERPRINT =
      "sha256:699f78bf950c2b4b01fab09b858df6c301ab0ce397f841e4fac1bc368f42e93b";

  private final String actorId = id();
  private final AtomicLong time = new AtomicLong(System.currentTimeMillis());
  private final RecordingStorage storage = new RecordingStorage();

  @Test
  void aFullJournalRefusesANewRequestUntilARecordIsFinal() {
    try (FakeAuthority authority = new FakeAuthority(exchange -> exchange.operationName().equals("ManagementResolveRequest")
        ? Response.json(reply(exchange.request(),
            map("result", resolution((String) input(exchange.request()).get("requestId"), "committed"))))
        : Response.drop())) {
      ManagementClient client = client(authority);
      List<String> ids = ids(128);
      for (String requestId : ids) {
        rejects(() -> create(client, requestId), "TRANSPORT_UNKNOWN", UNAVAILABLE);
      }
      String extra = id();
      refused(rejects(() -> create(client, extra), "RECOVERY_LIMIT", LIMIT), extra);
      assertEquals(128, mutations(authority));

      assertEquals("committed", client.requests().resolve(ids.get(0)).getState());
      rejects(() -> create(client, extra), "TRANSPORT_UNKNOWN", UNAVAILABLE);
      List<String> expected = new ArrayList<>(ids.subList(1, ids.size()));
      expected.add(extra);
      assertEquals(expected, ids(stored()));
      long most = 0;
      for (Map.Entry<String, String> write : this.storage.writes()) {
        most = Math.max(most, Repo.list(Json.parse(write.getValue())).size());
      }
      assertEquals(128, most);
      // The records are the TypeScript SDK's: the same fingerprint for the same mutation.
      assertEquals(ORGANIZATION_FINGERPRINT, stored().get(0).get("payloadFingerprint"));
    }
  }

  @Test
  void aFullJournalEvictsTheFinalRecordAttemptedLongestAgo() {
    AtomicBoolean online = new AtomicBoolean();
    try (FakeAuthority authority = new FakeAuthority(
        exchange -> online.get() ? rejected(exchange, "FORBIDDEN", 403, false) : Response.drop())) {
      ManagementClient client = client(authority);
      String lost = id();
      List<String> ids = ids(127);
      rejects(() -> create(client, lost), "TRANSPORT_UNKNOWN", UNAVAILABLE);
      online.set(true);
      // The first rejected request is resent last, so it is no longer the final record attempted longest ago.
      List<String> sends = new ArrayList<>(ids);
      sends.add(ids.get(0));
      for (String requestId : sends) {
        this.time.incrementAndGet();
        rejects(() -> create(client, requestId), "FORBIDDEN", null);
      }

      String extra = id();
      rejects(() -> create(client, extra), "FORBIDDEN", null);
      assertEquals(130, mutations(authority));
      List<Map<String, Object>> records = stored();
      List<String> expected = new ArrayList<>(Arrays.asList(lost, ids.get(0)));
      expected.addAll(ids.subList(2, ids.size()));
      expected.add(extra);
      assertEquals(expected, ids(records));
      List<Object> states = new ArrayList<>(Collections.singletonList("unknown"));
      states.addAll(Collections.nCopies(127, "rejected"));
      assertEquals(states, field(records, "resolutionState"));
      assertEquals(Arrays.asList(2L, "FORBIDDEN"),
          Arrays.asList(records.get(1).get("attemptCount"), records.get(1).get("lastAttemptClassification")));
      ManagementClient restarted = client(authority);
      assertEquals(snapshot(client.getRecoveryStates()), snapshot(restarted.getRecoveryStates()));
    }
  }

  @ParameterizedTest
  @CsvSource({"RATE_LIMITED, 429, true", "WRONG_REGION, 409, false", "NEWER_CODE, 409, true"})
  void aJournalFullOfResendableRejectionsRefusesNewRequests(String code, int status, boolean retryable) {
    AtomicBoolean accept = new AtomicBoolean();
    try (FakeAuthority authority = new FakeAuthority(exchange -> accept.get()
        ? Response.json(reply(exchange.request(), map("result", organization())))
        : rejected(exchange, code, status, retryable))) {
      ManagementClient client = client(authority);
      List<String> ids = ids(128);
      for (String requestId : ids) {
        rejects(() -> create(client, requestId), code, null);
      }
      for (RecoveryState state : client.getRecoveryStates()) {
        assertEquals(RecoveryState.Resolution.REJECTED, state.getResolution());
      }
      String extra = id();
      refused(rejects(() -> create(client, extra), "RECOVERY_LIMIT", LIMIT), extra);
      assertEquals(128, mutations(authority));

      // A kept request is resent under its own ID without a new record; once committed, its record makes room.
      accept.set(true);
      this.time.incrementAndGet();
      create(client, ids.get(5));
      create(client, extra);
      List<String> expected = new ArrayList<>(ids);
      expected.remove(5);
      expected.add(extra);
      assertEquals(expected, ids(stored()));
      assertEquals(130, mutations(authority));
    }
  }

  @Test
  void aSpentRetryBudgetMakesAResendableRejectionFinal() {
    try (FakeAuthority authority = new FakeAuthority(exchange -> rejected(exchange, "RATE_LIMITED", 429, true))) {
      long start = this.time.get();
      ManagementClient client = client(authority);
      List<String> ids = ids(128);
      for (String requestId : ids) {
        rejects(() -> create(client, requestId), "RATE_LIMITED", null);
      }
      for (int resend = 0; resend < 2; resend++) {
        this.time.incrementAndGet();
        rejects(() -> create(client, ids.get(3)), "RATE_LIMITED", null);
      }

      String extra = id();
      rejects(() -> create(client, extra), "RATE_LIMITED", null);
      List<String> expected = new ArrayList<>(ids);
      expected.remove(3);
      expected.add(extra);
      assertEquals(expected, ids(stored()));

      this.time.set(start + WINDOW + 1);
      String later = id();
      rejects(() -> create(client, later), "RATE_LIMITED", null);
      expected.remove(0);
      expected.add(later);
      assertEquals(expected, ids(stored()));
      assertEquals(132, mutations(authority));
    }
  }

  @Test
  void aSpentRetryBudgetMakesAnUnansweredRequestFinal() {
    AtomicBoolean online = new AtomicBoolean();
    try (FakeAuthority authority = new FakeAuthority(exchange -> {
      if (exchange.operationName().equals("ManagementResolveRequest")) {
        return Response.json(reply(exchange.request(),
            map("result", resolution((String) input(exchange.request()).get("requestId"), "notObservedYet"))));
      }
      return online.get() ? Response.json(reply(exchange.request(), map("result", organization()))) : Response.drop();
    })) {
      ManagementClient client = client(authority);
      List<String> ids = ids(127);
      for (String requestId : ids) {
        rejects(() -> create(client, requestId), "TRANSPORT_UNKNOWN", UNAVAILABLE);
      }
      String spent = id(), extra = id();
      for (int attempt = 1; attempt <= 3; attempt++) {
        this.time.incrementAndGet();
        rejects(() -> create(client, spent), "TRANSPORT_UNKNOWN", UNAVAILABLE);
        if (attempt < 3) {
          refused(rejects(() -> create(client, extra), "RECOVERY_LIMIT", LIMIT), extra);
        }
      }
      // The SDK won't send the request again, so its record is final though its outcome is unknown.
      online.set(true);
      ConvoHopProblem problem = rejects(() -> create(client, spent), "RESOLUTION_REQUIRED", null);
      assertEquals(Arrays.asList(spent, "unknown", 409),
          Arrays.<Object>asList(problem.getRequestId(), problem.getOutcome(), problem.getStatus()));
      assertEquals(130, mutations(authority));
      create(client, extra);
      List<String> expected = new ArrayList<>(ids);
      expected.add(extra);
      assertEquals(expected, ids(stored()));

      // Forgotten, the request can still be resolved, but not retried.
      assertEquals("notObservedYet", client.requests().resolve(spent).getState());
      assertThrows(IllegalStateException.class, () -> client.requests().retry(spent));
      // Sent again under its ID, it is a new record with a new budget. The authority deduplicates by request ID.
      create(client, spent);
      expected.set(expected.size() - 1, spent);
      List<Map<String, Object>> records = stored();
      assertEquals(expected, ids(records));
      assertEquals(Arrays.asList(1L, "committed"), Arrays.asList(records.get(127).get("attemptCount"),
          records.get(127).get("resolutionState")));
      assertEquals(132, mutations(authority));
    }
  }

  @Test
  void aRequestIsRejectedOnlyIfEveryAttemptWas() {
    Queue<String> plan = new ConcurrentLinkedQueue<>(Arrays.asList("lost", "rejected", "rejected", "lost"));
    try (FakeAuthority authority = new FakeAuthority(exchange -> "lost".equals(plan.poll())
        ? Response.drop()
        : rejected(exchange, "FORBIDDEN", 403, false))) {
      ManagementClient client = client(authority);
      String first = id(), second = id();
      rejects(() -> create(client, first), "TRANSPORT_UNKNOWN", UNAVAILABLE);
      rejects(() -> create(client, second), "FORBIDDEN", null);
      this.time.incrementAndGet();
      rejects(() -> create(client, first), "FORBIDDEN", null);
      rejects(() -> create(client, second), "TRANSPORT_UNKNOWN", UNAVAILABLE);

      List<List<Object>> states = new ArrayList<>();
      for (RecoveryState state : client.getRecoveryStates()) {
        states.add(Arrays.asList(state.getResolution(), state.getAttemptCount(), state.getLastAttemptClassification()));
      }
      assertEquals(Arrays.asList(
              Arrays.<Object>asList(RecoveryState.Resolution.UNKNOWN, 2, "FORBIDDEN"),
              Arrays.<Object>asList(RecoveryState.Resolution.UNKNOWN, 2, "TRANSPORT_UNKNOWN")),
          states);
      assertEquals(Arrays.asList("unknown", "unknown"), field(stored(), "resolutionState"));
    }
  }

  @Test
  void restoredRecordsMakeRoomOnlyOnceFinal() {
    long now = this.time.get();
    // In the order they make room: the one attempted longest ago first.
    List<Map<String, Object>> fin = Arrays.asList(
        record(now, "committed", "authorityReceipt", map("lastAttemptAt", now - 9)),
        record(now, "rejected", "RATE_LIMITED", map("retryDeadline", now - 1, "lastAttemptAt", now - 8)),
        record(now, "rejected", "FORBIDDEN", map("lastAttemptAt", now - 7)),
        record(now, "rejected", "RATE_LIMITED", map("attemptCount", 3, "lastAttemptAt", now - 6)),
        // Final too, though no answer settled them, since their budget is spent.
        record(now, "unknown", "TRANSPORT_UNKNOWN", map("attemptCount", 3, "lastAttemptAt", now - 5)),
        record(now, "pending", "notSubmitted", map("attemptCount", 0, "retryDeadline", now - 1, "lastAttemptAt", now - 4)));
    List<Map<String, Object>> kept = Arrays.asList(
        record(now, "rejected", "RATE_LIMITED", map("attemptCount", 2)),
        record(now, "rejected", "WRONG_REGION", map()),
        record(now, "rejected", "NEWER_CODE", map()),
        record(now, "unknown", "submitted", map()),
        record(now, "pending", "notSubmitted", map("attemptCount", 0)),
        // A record from a clock that was ahead refuses a resend only until this clock catches up.
        record(now, "unknown", "submitted",
            map("firstSubmittedAt", now + 30_000, "lastAttemptAt", now + 30_000, "retryDeadline", now + 90_000)));
    List<Map<String, Object>> saved = new ArrayList<>();
    saved.add(fin.get(2));
    saved.addAll(kept.subList(0, 2));
    saved.add(fin.get(0));
    saved.add(fin.get(5));
    for (int filler = 0; filler < 128 - fin.size() - kept.size(); filler++) {
      saved.add(record(now, "unknown", "TRANSPORT_UNKNOWN", map()));
    }
    saved.add(fin.get(3));
    saved.addAll(kept.subList(2, kept.size()));
    saved.add(fin.get(1));
    saved.add(fin.get(4));
    this.storage.put(key(), Json.stringify(saved));
    try (FakeAuthority authority = new FakeAuthority(exchange -> Response.drop())) {
      ManagementClient client = client(authority);
      List<String> extras = ids(fin.size());
      for (int count = 1; count <= extras.size(); count++) {
        String extra = extras.get(count - 1);
        rejects(() -> create(client, extra), "TRANSPORT_UNKNOWN", UNAVAILABLE);
        List<String> expected = ids(saved);
        expected.removeAll(ids(fin.subList(0, count)));
        expected.addAll(extras.subList(0, count));
        assertEquals(expected, ids(stored()));
      }

      rejects(() -> create(client, id()), "RECOVERY_LIMIT", LIMIT);
      assertEquals(fin.size(), mutations(authority));
    }
  }

  private ManagementClient client(FakeAuthority authority) {
    return ManagementClient.builder().baseUrl(authority.baseUrl()).actorId(this.actorId).accessToken("fixture-operator")
        .recoveryStorage(this.storage).clock(this.time::get).build();
  }

  private String key() {
    return "convohop.requests:management:" + this.actorId;
  }

  private List<Map<String, Object>> stored() {
    List<Map<String, Object>> records = new ArrayList<>();
    for (Object record : Repo.list(Json.parse(Objects.requireNonNull(this.storage.value(key()))))) {
      records.add(Repo.object(record));
    }
    return records;
  }

  private static CreateOrganizationReply create(ManagementClient client, String requestId) {
    return client.management().createOrganization(
        CreateOrganizationRequestInput.builder().name("Original").termsRef("fixture").build(), requestId);
  }

  private static ConvoHopProblem rejects(Executable call, String code, @Nullable String message) {
    ConvoHopProblem problem = assertThrows(ConvoHopProblem.class, call);
    assertEquals(code, problem.getCode());
    if (message != null) {
      assertEquals(message, problem.getMessage());
    }
    return problem;
  }

  /** The new request was refused before it was sent, so it had no effect. */
  private static void refused(ConvoHopProblem problem, String requestId) {
    assertEquals(requestId, problem.getRequestId());
    assertEquals("rejected", problem.getOutcome());
    assertEquals(409, problem.getStatus());
  }

  private static Response rejected(Exchange exchange, String code, int status, boolean retryable) {
    Map<String, Object> extensions = map("code", code, "requestId", requestId(exchange.request()), "outcome", "rejected",
        "retryable", retryable, "status", status);
    return Response.json(Json.stringify(
        map("errors", Collections.singletonList(map("message", "Not now", "extensions", extensions)))));
  }

  private static Map<String, Object> organization() {
    return full("Organization", map("orgId", id(), "name", "Original", "status", "active", "revision", "1"));
  }

  private static Map<String, Object> record(long now, String state, String classification, Map<String, Object> fields) {
    Map<String, Object> record = map(
        "requestId", id(),
        "incarnation", "management",
        "payloadFingerprint", ORGANIZATION_FINGERPRINT,
        "operation", "management.createOrganization",
        "input", map("name", "Original", "termsRef", "fixture"),
        "firstSubmittedAt", now - 10,
        "retryDeadline", now - 10 + WINDOW,
        "attemptCount", 1,
        "lastAttemptAt", now - 10,
        "lastAttemptClassification", classification,
        "resolutionState", state);
    record.putAll(fields);
    return record;
  }

  private static int mutations(FakeAuthority authority) {
    int count = 0;
    for (Exchange exchange : authority.exchanges()) {
      if (exchange.operationName().equals("ManagementCreateOrganization")) {
        count++;
      }
    }
    return count;
  }

  private static List<List<Object>> snapshot(List<RecoveryState> states) {
    List<List<Object>> snapshot = new ArrayList<>();
    for (RecoveryState state : states) {
      snapshot.add(Arrays.asList(state.getRequestId(), state.getIncarnation(), state.getPayloadFingerprint(),
          state.getOperation(), state.getProjectId(), state.getInput(), state.getFirstSubmittedAt(),
          state.getRetryDeadline(), state.getAttemptCount(), state.getLastAttemptAt(),
          state.getLastAttemptClassification(), state.getResolution(), state.isMediaAdmissionAttempted()));
    }
    return snapshot;
  }

  private static List<Object> field(List<Map<String, Object>> records, String name) {
    List<Object> values = new ArrayList<>();
    for (Map<String, Object> record : records) {
      values.add(record.get(name));
    }
    return values;
  }

  private static List<String> ids(List<Map<String, Object>> records) {
    List<String> ids = new ArrayList<>();
    for (Map<String, Object> record : records) {
      ids.add((String) record.get("requestId"));
    }
    return ids;
  }

  private static List<String> ids(int count) {
    List<String> ids = new ArrayList<>();
    for (int index = 0; index < count; index++) {
      ids.add(id());
    }
    return ids;
  }

  private static String id() {
    return UUID.randomUUID().toString();
  }
}
