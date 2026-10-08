package com.convohop.server;

import static com.convohop.server.testing.Fixtures.full;
import static com.convohop.server.testing.Fixtures.input;
import static com.convohop.server.testing.Fixtures.map;
import static com.convohop.server.testing.Fixtures.problem;
import static com.convohop.server.testing.Fixtures.reply;
import static com.convohop.server.testing.Fixtures.requestId;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.convohop.server.api.CommunicationApi;
import com.convohop.server.model.Member;
import com.convohop.server.model.MemberPage;
import com.convohop.server.model.MembersRequestInput;
import com.convohop.server.model.MessagePage;
import com.convohop.server.model.MessagesRequestInput;
import com.convohop.server.testing.FakeAuthority;
import com.convohop.server.testing.FakeAuthority.Exchange;
import com.convohop.server.testing.FakeAuthority.Response;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.Test;

/** Covers the generated pages methods: lazy requests, cursors, refreshes and pages that do not advance. */
class PaginationTest {
  @Test
  void pagesFollowEachNextCursorWithANewRequestUntilTheCompletePage() {
    String conversationId = id();
    List<String> principals = Arrays.asList(id(), id(), id());
    try (FakeAuthority authority = new FakeAuthority(exchange -> {
      Object cursor = input(exchange.request()).get("cursor");
      if (cursor == null) {
        return members(exchange, conversationId, principals.subList(0, 2), false, "after-2");
      }
      return "after-2".equals(cursor)
          ? members(exchange, conversationId, principals.subList(2, 3), false, "after-3")
          : members(exchange, conversationId, Collections.<String>emptyList(), true, null);
    })) {
      Iterable<MemberPage> pages = client(authority).communication().membersPages(membersInput(conversationId, null));
      assertEquals(0, authority.exchanges().size(), "nothing is sent before iteration");

      List<String> listed = new ArrayList<>();
      for (MemberPage page : pages) {
        for (Member member : page.getItems()) {
          listed.add(member.getPrincipalId());
        }
      }
      assertEquals(principals, listed);
      List<Map<String, Object>> requests = authority.requests();
      assertEquals(Arrays.asList(
          map("conversationId", conversationId, "limit", 2L),
          map("conversationId", conversationId, "limit", 2L, "cursor", "after-2"),
          map("conversationId", conversationId, "limit", 2L, "cursor", "after-3")), inputs(requests));
      assertEquals(3, new HashSet<>(requestIds(requests)).size(), "every page has a new request ID");

      Iterator<MemberPage> again = pages.iterator();
      assertEquals(2, again.next().getItems().size());
      assertEquals(map("conversationId", conversationId, "limit", 2L), input(authority.requests().get(3)),
          "each iteration starts again from the input");
      again.next();
      assertTrue(again.next().getComplete());
      assertFalse(again.hasNext());
      assertThrows(NoSuchElementException.class, again::next);
      assertEquals(6, authority.exchanges().size(), "nothing is requested after the complete page");
    }
  }

  @Test
  void descendingDecimalCursorsMustDecrease() {
    String conversationId = id();
    try (FakeAuthority authority = new FakeAuthority(exchange -> {
      Object before = input(exchange.request()).get("beforeSequence");
      if (before == null) {
        return messages(exchange, false, "50");
      }
      return "50".equals(before) ? messages(exchange, false, "9") : messages(exchange, true, null);
    })) {
      List<MessagePage> pages = new ArrayList<>();
      client(authority).communication().messagesPages(messagesInput(conversationId, null)).forEach(pages::add);
      assertEquals(3, pages.size());
      List<Object> cursors = new ArrayList<>();
      for (Map<String, Object> request : authority.requests()) {
        cursors.add(input(request).get("beforeSequence"));
      }
      assertEquals(Arrays.asList(null, "50", "9"), cursors, "decimal cursors compare as numbers, not text");
    }

    AtomicReference<@Nullable String> next = new AtomicReference<>();
    try (FakeAuthority authority = new FakeAuthority(exchange -> messages(exchange, false, next.get()))) {
      CommunicationApi api = client(authority).communication();
      for (String cursor : Arrays.asList("100", "101")) {
        next.set(cursor);
        invalid(authority, api.messagesPages(messagesInput(conversationId, "100")).iterator(),
            "Incomplete page did not advance the cursor");
      }
      for (String cursor : Arrays.asList("fifty", "-1", "9223372036854775808")) {
        next.set(cursor);
        invalid(authority, api.messagesPages(messagesInput(conversationId, null)).iterator(), "Malformed next cursor");
      }

      int sent = authority.exchanges().size();
      for (String cursor : Arrays.asList("fifty", "01", "9223372036854775808")) {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
            () -> api.messagesPages(messagesInput(conversationId, cursor)), cursor);
        assertEquals("Invalid beforeSequence cursor", error.getMessage());
      }
      assertEquals(sent, authority.exchanges().size(), "an invalid first cursor sends nothing");
    }
  }

  @Test
  void incompletePagesNeedANextCursorThatChanges() {
    String conversationId = id();
    AtomicReference<Function<Exchange, Response>> next = new AtomicReference<>();
    try (FakeAuthority authority = new FakeAuthority(exchange -> next.get().apply(exchange))) {
      CommunicationApi api = client(authority).communication();

      next.set(exchange -> members(exchange, conversationId, Collections.<String>emptyList(), false, null));
      invalid(authority, api.membersPages(membersInput(conversationId, null)).iterator(),
          "Incomplete page has no next cursor");

      next.set(exchange -> members(exchange, conversationId, Collections.<String>emptyList(), false, "same"));
      invalid(authority, api.membersPages(membersInput(conversationId, "same")).iterator(),
          "Incomplete page did not advance the cursor");
      Iterator<MemberPage> pages = api.membersPages(membersInput(conversationId, null)).iterator();
      assertEquals("same", pages.next().getNextCursor(), "the first page may return any cursor");
      invalid(authority, pages, "Incomplete page did not advance the cursor");

      next.set(exchange -> Response.json(reply(exchange.request(), map("result", null))));
      invalid(authority, api.membersPages(membersInput(conversationId, null)).iterator(),
          "Missing current authority result");
    }
  }

  @Test
  void aPageThatRequiresARefreshEndsIterationInsteadOfResumingFromTheCursor() {
    String conversationId = id();
    try (FakeAuthority authority = new FakeAuthority(exchange -> Response.json(reply(exchange.request(),
        map("result", full("MemberPage", map("items", Collections.emptyList(), "complete", true,
            "refreshRequired", true, "nextCursor", "after-1"))))))) {
      Iterator<MemberPage> pages =
          client(authority).communication().membersPages(membersInput(conversationId, "after-0")).iterator();
      IllegalStateException error = assertThrows(IllegalStateException.class, pages::hasNext);
      assertEquals(IllegalStateException.class, error.getClass());
      assertEquals("Explicit authorized resynchronization required", error.getMessage());
      assertSame(error, assertThrows(IllegalStateException.class, pages::next), "the failure is final");
      assertEquals(1, authority.exchanges().size());
    }
  }

  @Test
  void aRejectedRequestKeepsThePositionSoTheNextHasNextRepeatsIt() {
    String conversationId = id();
    AtomicInteger calls = new AtomicInteger();
    try (FakeAuthority authority = new FakeAuthority(exchange -> {
      switch (calls.incrementAndGet()) {
        case 1:
          return members(exchange, conversationId, Collections.<String>emptyList(), false, "after-1");
        case 2:
          return Response.json(problem("FORBIDDEN", "rejected", 403, "Backend scope missing",
              requestId(exchange.request())));
        default:
          return members(exchange, conversationId, Collections.<String>emptyList(), true, null);
      }
    })) {
      Iterator<MemberPage> pages =
          client(authority).communication().membersPages(membersInput(conversationId, null)).iterator();
      assertFalse(pages.next().getComplete());
      ConvoHopProblem problem = assertThrows(ConvoHopProblem.class, pages::hasNext);
      assertEquals("FORBIDDEN", problem.getCode());
      assertTrue(pages.hasNext());
      assertTrue(pages.next().getComplete());
      assertFalse(pages.hasNext());

      List<Map<String, Object>> requests = authority.requests();
      assertEquals(Arrays.asList(null, "after-1", "after-1"), Arrays.asList(
          input(requests.get(0)).get("cursor"), input(requests.get(1)).get("cursor"),
          input(requests.get(2)).get("cursor")));
      assertNotEquals(requestId(requests.get(1)), requestId(requests.get(2)));
    }
  }

  private static void invalid(FakeAuthority authority, Iterator<?> pages, String message) {
    ConvoHopProblem problem = assertThrows(ConvoHopProblem.class, pages::hasNext, message);
    assertEquals("INVALID_RESPONSE", problem.getCode(), message);
    assertEquals("unknown", problem.getOutcome(), message);
    assertEquals(message, problem.getMessage());
    List<Map<String, Object>> requests = authority.requests();
    assertEquals(requestId(requests.get(requests.size() - 1)), problem.getRequestId(), message);
    assertSame(problem, assertThrows(ConvoHopProblem.class, pages::hasNext), "the failure is final");
    assertEquals(requests.size(), authority.exchanges().size(), "a failed iteration sends nothing more");
  }

  private static ProjectServerClient client(FakeAuthority authority) {
    return ProjectServerClient.builder()
        .baseUrl(authority.baseUrl())
        .projectId(id())
        .incarnation(id())
        .backendKey("fixture-backend-key")
        .build();
  }

  private static MembersRequestInput membersInput(String conversationId, @Nullable String cursor) {
    MembersRequestInput.Builder builder = MembersRequestInput.builder().conversationId(conversationId).limit(2);
    return (cursor == null ? builder : builder.cursor(cursor)).build();
  }

  private static MessagesRequestInput messagesInput(String conversationId, @Nullable String beforeSequence) {
    MessagesRequestInput.Builder builder = MessagesRequestInput.builder().conversationId(conversationId).limit(2);
    return (beforeSequence == null ? builder : builder.beforeSequence(beforeSequence)).build();
  }

  private static Response members(
      Exchange exchange, String conversationId, List<String> principals, boolean complete, @Nullable String next) {
    List<Object> items = new ArrayList<>();
    for (String principalId : principals) {
      items.add(full("Member", map("conversationId", conversationId, "principalId", principalId, "role", "member",
          "status", "active", "membershipEpoch", "1", "visibilityEpoch", "1", "revision", "1",
          "visibleFromSequence", "1", "canStartBroadcast", false)));
    }
    return Response.json(reply(exchange.request(), map("result", full("MemberPage",
        map("items", items, "complete", complete, "refreshRequired", false, "nextCursor", next)))));
  }

  private static Response messages(Exchange exchange, boolean complete, @Nullable String next) {
    return Response.json(reply(exchange.request(), map("result", full("MessagePage",
        map("items", Collections.emptyList(), "complete", complete, "refreshRequired", false, "nextCursor", next)))));
  }

  private static List<Map<String, Object>> inputs(List<Map<String, Object>> requests) {
    List<Map<String, Object>> inputs = new ArrayList<>();
    for (Map<String, Object> request : requests) {
      inputs.add(input(request));
    }
    return inputs;
  }

  private static List<String> requestIds(List<Map<String, Object>> requests) {
    List<String> ids = new ArrayList<>();
    for (Map<String, Object> request : requests) {
      ids.add(requestId(request));
    }
    return ids;
  }

  private static String id() {
    return UUID.randomUUID().toString();
  }
}
