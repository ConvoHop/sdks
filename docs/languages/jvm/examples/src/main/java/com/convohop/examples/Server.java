package com.convohop.examples;

// #region imports
import com.convohop.server.ConvoHopProblem;
import com.convohop.server.ProjectServerClient;
import com.convohop.server.model.CreateConversationRequestInput;
import com.convohop.server.model.MemberInputInput;
import com.convohop.server.model.Message;
import com.convohop.server.model.MessageAck;
import com.convohop.server.model.RequestResolution;
import com.convohop.server.model.ResolvedReceipt;
import com.convohop.server.model.RetainedResult;
import com.convohop.server.model.SessionBootstrap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
// #endregion imports

/** Server quickstart snippets. ServerTest runs them against the conformance mock. */
public final class Server {
  private Server() {}

  // #region connect
  // backendKey comes from your secret store. Never send it to a browser or an app.
  public static ProjectServerClient connect(
      String baseUrl, String projectId, String incarnation, String backendKey) {
    ProjectServerClient server = ProjectServerClient.builder()
        .baseUrl(baseUrl)
        .projectId(projectId)
        .incarnation(incarnation)
        .backendKey(backendKey)
        .build();
    server.initialize(); // Reads the project's route and checks the project and incarnation.
    return server;
  }
  // #endregion connect

  // #region bootstrap
  // Call this after your own authentication. accountId is your user's ID: never trust a principal ID
  // that a browser or an app sends. deviceId is the UUID that the app generated for its installation.
  // Returns the JSON object that your login endpoint sends to the signed-in user's app.
  public static Map<String, Object> bootstrapUser(
      ProjectServerClient server, String baseUrl, String projectId, String accountId, String deviceId) {
    String principalId = server.principals().create(accountId).getPrincipalId(); // The same principal on every login.
    SessionBootstrap bootstrap = server.sessions().issue(principalId, deviceId); // Expires in 15 minutes by default.
    Map<String, Object> body = new LinkedHashMap<>(bootstrap.toJson()); // The session and its token.
    body.put("baseUrl", baseUrl);
    body.put("projectId", projectId);
    return body;
  }
  // #endregion bootstrap

  // #region create-conversation
  public static String createConversation(
      ProjectServerClient server, String title, List<String> principalIds, String requestId) {
    List<MemberInputInput> members = principalIds.stream()
        .map(principalId -> MemberInputInput.builder().principalId(principalId).role("member").build())
        .collect(Collectors.toList());
    CreateConversationRequestInput input = CreateConversationRequestInput.builder()
        .title(title)
        .props(Map.of())
        .members(members)
        .build();
    return server.conversations().create(input, requestId).getConversationId();
  }
  // #endregion create-conversation

  // #region send-message
  // Sends as a member. Without actAs, the backend's own principal is the sender.
  public static String sendAs(
      ProjectServerClient server, String conversationId, String authorId, String text, String requestId) {
    MessageAck ack = server.conversation(conversationId).messages().send(text, /* props */ null, authorId, requestId);
    return ack.getMessageId();
  }
  // #endregion send-message

  // #region list-messages
  // Reads what one member can see, newest first.
  public static List<Message> latestMessages(ProjectServerClient server, String conversationId, String readerId) {
    return server.conversation(conversationId).messages().list(readerId, /* beforeSequence */ null, 20).getItems();
  }
  // #endregion list-messages

  // #region recover
  // A lost response leaves the outcome unknown: the message may or may not exist. Ask about the
  // same request ID instead of sending with a new one, which could post the message twice.
  // Returns the message ID, or null if the authority withheld the result.
  public static String sendOnce(
      ProjectServerClient server, String conversationId, String authorId, String text, String requestId) {
    try {
      return sendAs(server, conversationId, authorId, text, requestId);
    } catch (ConvoHopProblem problem) {
      if (!problem.getOutcome().equals("unknown")) {
        throw problem;
      }
      // Resolves the request first, and resends the original only if the authority never saw it.
      RequestResolution resolution = server.requests().retry(requestId);
      if (!resolution.getState().equals("committed")) {
        throw problem;
      }
      ResolvedReceipt receipt = resolution.getReceipt();
      RetainedResult result = receipt == null ? null : receipt.getResult();
      MessageAck ack = result == null ? null : result.getMessageAck();
      return ack == null ? null : ack.getMessageId();
    }
  }
  // #endregion recover
}
