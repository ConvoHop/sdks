# Java and Kotlin server quickstart

Call ConvoHop from your Java or Kotlin backend with `convohop-server`: connect with a backend key, sign in your users, create a conversation, send and read messages as a member, recover a send whose response was lost, and make the calls from coroutines.

## Before you start

You need Java 11 or later and `convohop-server` ([install](../index.md#install)). For your project, you need the Communication API's base URL, the project ID, the project's incarnation and a backend key, which the [`management.issueBackendKey`](../../operations/management/issueBackendKey.md) operation delivers once.

Keep the backend key in your secret store. Its scopes limit what it can do. This quickstart needs `principalManage`, `sessionIssue`, `conversationManage`, `messageRead` and `messageWrite`.

The Java samples on this page use these imports:

```java snippet=docs/languages/jvm/examples/src/main/java/com/convohop/examples/Server.java#imports
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
```

## Connect

Building the client sends nothing. `initialize()` looks up your project's route before the first call, and throws `IllegalStateException` if the project or its incarnation changed. Calls block the calling thread, and the client is safe for concurrent use, so create one and share it.

```java snippet=docs/languages/jvm/examples/src/main/java/com/convohop/examples/Server.java#connect
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
```

## Sign in a user

ConvoHop doesn't authenticate your users. After your own login succeeds, map the user to a principal and issue a session for the device. Return the result to the user's app, which passes it to a client SDK, as the [TypeScript client quickstart](../../typescript/quickstarts/client.md) shows.

```java snippet=docs/languages/jvm/examples/src/main/java/com/convohop/examples/Server.java#bootstrap
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
```

`principals().create` returns the same principal for the same account ID, so call it on every login. A session token acts only as its principal.

## Create a conversation

Commands such as `conversations().create` take a request ID that identifies the action. Create one per action, for example with `UUID.randomUUID().toString()`, and keep it until you know the outcome: [recover a lost response](#recover-a-lost-response) shows why.

```java snippet=docs/languages/jvm/examples/src/main/java/com/convohop/examples/Server.java#create-conversation
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
```

## Send and read messages

Your backend isn't a member of the conversation. To send or read as a member, pass the member's principal ID as `actAs`. The authority checks what that member can do and audits the call. With a null `actAs`, the backend's own service principal sends the message.

```java snippet=docs/languages/jvm/examples/src/main/java/com/convohop/examples/Server.java#send-message
// Sends as a member. Without actAs, the backend's own principal is the sender.
public static String sendAs(
    ProjectServerClient server, String conversationId, String authorId, String text, String requestId) {
  MessageAck ack = server.conversation(conversationId).messages().send(text, /* props */ null, authorId, requestId);
  return ack.getMessageId();
}
```

```java snippet=docs/languages/jvm/examples/src/main/java/com/convohop/examples/Server.java#list-messages
// Reads what one member can see, newest first.
public static List<Message> latestMessages(ProjectServerClient server, String conversationId, String readerId) {
  return server.conversation(conversationId).messages().list(readerId, /* beforeSequence */ null, 20).getItems();
}
```

## Recover a lost response

When a connection drops after a command is sent, the SDK can't tell whether the authority committed it, so it throws a `ConvoHopProblem` whose `getOutcome()` is `unknown`. Sending again with a new request ID could post the message twice. Instead, `requests().retry` asks the authority about the original request. It returns the committed result, or resends the original command if the authority never received it.

```java snippet=docs/languages/jvm/examples/src/main/java/com/convohop/examples/Server.java#recover
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
```

Retry with the same `ProjectServerClient`, which keeps the original request in memory. It sends a request at most three times, within a minute of the first attempt. After that, `retry` throws a `ConvoHopProblem` whose code is `RESOLUTION_REQUIRED`. To retry after a restart, pass a `RecoveryStorage` to the builder's `recoveryStorage`, as [recovery](https://github.com/ConvoHop/sdks/blob/main/jvm/README.md#recovery) describes. Recovery storage holds request inputs, never tokens or keys.

## Use coroutines in Kotlin

`convohop-server-kotlin` turns each plane API into a suspending one: `server.communication().suspending()`. Its calls run on `Dispatchers.IO` unless you pass another dispatcher, and its methods that page return a cold `Flow`. Run the client's blocking helpers, such as `principals()` and `sessions()`, in `interruptible`.

```kotlin snippet=docs/languages/jvm/examples/src/main/kotlin/com/convohop/examples/Coroutines.kt#coroutines
import com.convohop.server.ProjectServerClient
import com.convohop.server.kotlin.interruptible
import com.convohop.server.kotlin.suspending
import com.convohop.server.model.Message
import com.convohop.server.model.MessagesRequestInput

// The blocking helpers run in interruptible: cancelling the coroutine interrupts the request.
suspend fun principalFor(server: ProjectServerClient, accountId: String): String =
    interruptible { server.principals().create(accountId).principalId }

// Every message that one member can see, newest first. The flow requests each page only after
// the previous one has been handled, and stops after the last.
suspend fun forEachMessage(
    server: ProjectServerClient,
    conversationId: String,
    readerId: String,
    pageSize: Int,
    action: suspend (Message) -> Unit,
) {
    val input = MessagesRequestInput.builder()
        .conversationId(conversationId)
        .actAsPrincipalId(readerId)
        .limit(pageSize)
        .build()
    server.communication().suspending().messagesPages(input).collect { page ->
        page.items.forEach { action(it) }
    }
}
```

Cancelling the calling coroutine interrupts the blocking request. The call then fails with a `CancellationException` whose cause is the `TRANSPORT_UNKNOWN` problem, and a mutation stays in the client's recovery records, so you can resolve or retry it.

## Next steps

- [Webhooks quickstart](webhooks.md): react to events in your backend.
- [`ProjectServerClient` reference](../reference/server.md#projectserverclient-class): every method, with the operation it sends.
- [`convohop-server-kotlin` reference](../reference/server-kotlin.md): the suspending APIs, `interruptible` and the page flows.
