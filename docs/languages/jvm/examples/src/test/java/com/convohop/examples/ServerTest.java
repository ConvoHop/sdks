package com.convohop.examples;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import com.convohop.server.ProjectServerClient;
import com.convohop.server.internal.Json;
import com.convohop.server.testing.Repo;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ServerTest {
  private static Mock mock;

  @BeforeAll
  static void start() throws IOException {
    mock = Mock.start();
  }

  @AfterAll
  static void stop() {
    mock.close();
  }

  /** A server client and a conversation between two members, alice and bob. */
  private static final class Members {
    final ProjectServerClient server = mock.connect();
    final String alice = mock.login(server, "alice");
    final String bob = mock.login(server, "bob");
    final String conversationId;

    Members(String title) {
      conversationId = Server.createConversation(server, title, List.of(alice, bob), UUID.randomUUID().toString());
    }

    List<List<Object>> visibleToBob() {
      return Server.latestMessages(server, conversationId, bob).stream()
          .map(message -> Arrays.<Object>asList(message.getMessageId(), message.getAuthorId(), message.getText()))
          .collect(Collectors.toList());
    }
  }

  @Test
  void bootstrapUserReturnsTheSamePrincipalOnEveryLoginAndAUsableSession() {
    ProjectServerClient server = mock.connect();
    String accountId = "carol-" + UUID.randomUUID();
    Map<String, Object> first =
        Server.bootstrapUser(server, mock.baseUrl, mock.projectId, accountId, UUID.randomUUID().toString());
    Map<String, Object> second =
        Server.bootstrapUser(server, mock.baseUrl, mock.projectId, accountId, UUID.randomUUID().toString());
    Map<String, Object> session = Repo.object(first.get("session"));
    assertEquals(session.get("principalId"), Repo.object(second.get("session")).get("principalId"));
    assertEquals(mock.incarnation, session.get("incarnation"));
    assertNotEquals(first.get("sessionToken"), second.get("sessionToken"));
    assertEquals(mock.baseUrl, first.get("baseUrl"));
    assertEquals(mock.projectId, first.get("projectId"));
    // Plain JSON values, which any JSON library writes as they are.
    assertEquals(first, Json.parse(Json.stringify(first)));
  }

  @Test
  void aMembersMessageIsListedForTheOtherMember() {
    Members members = new Members("Launch plan");
    String messageId = Server.sendAs(
        members.server, members.conversationId, members.alice, "Ship it on Monday?", UUID.randomUUID().toString());
    assertEquals(List.of(List.of(messageId, members.alice, "Ship it on Monday?")), members.visibleToBob());
  }

  @ParameterizedTest
  @ValueSource(strings = {"dropBeforeCommit", "dropAfterCommit"})
  void sendOncePostsExactlyOneMessageWhenTheConnectionDrops(String action) {
    Members members = new Members("Lost reply " + action);
    mock.injectFault("sendMessage", action);
    String requestId = UUID.randomUUID().toString();
    String messageId = Server.sendOnce(members.server, members.conversationId, members.alice, "Did it land?", requestId);
    assertEquals(List.of(Arrays.asList(messageId, members.alice, "Did it land?")), members.visibleToBob());
    // The first attempt was dropped. Only a request that never reached the authority is sent again.
    List<Boolean> expected = action.equals("dropBeforeCommit") ? List.of(true, false) : List.of(true);
    assertEquals(expected, mock.attempts("sendMessage", requestId));
  }
}
