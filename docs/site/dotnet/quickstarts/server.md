# .NET server quickstart

Call ConvoHop from your .NET backend with the `ConvoHop` package: connect with a backend key, sign in your users, create a conversation, send and read messages as a member, and recover a send whose response was lost.

## Before you start

You need .NET 8 or later and the `ConvoHop` package ([install](../index.md#install)). For your project, you need the Communication API's base URL, the project ID, the project's incarnation and a backend key, which the [`management.issueBackendKey`](../../operations/management/issueBackendKey.md) operation delivers once.

Keep the backend key in your secret store. Its scopes limit what it can do. This quickstart needs `principalManage`, `sessionIssue`, `conversationManage`, `messageRead` and `messageWrite`.

The samples use these namespaces:

```cs snippet=docs/languages/dotnet/examples/src/Server.cs#usings
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop;
using ConvoHop.Models;
```

## Connect

`InitializeAsync` reads your project's route before the first call. It throws an `InvalidOperationException` when the project has a new incarnation: recover explicitly instead of switching incarnations.

```cs snippet=docs/languages/dotnet/examples/src/Server.cs#connect
public sealed record ServerConfig(
    string BaseUrl,
    string ProjectId,
    string Incarnation,
    string BackendKey); // From your secret store. Never send it to a browser or an app.

// Create one client when your backend starts and share it: it's safe for concurrent use.
public static async Task<ProjectServerClient> ConnectAsync(ServerConfig config, CancellationToken cancellationToken)
{
    var server = new ProjectServerClient(new ProjectServerClientOptions
    {
        BaseUrl = config.BaseUrl,
        ProjectId = config.ProjectId,
        Incarnation = config.Incarnation,
        BackendKey = config.BackendKey,
    });
    await server.InitializeAsync(cancellationToken);
    return server;
}
```

`BaseUrl` is an HTTPS origin, or HTTP on a loopback host for local development. The client gives each request 12 seconds and never follows redirects. To pass your own `HttpClient`, create it with `AllowAutoRedirect = false`, as the [`ProjectServerClientOptions` reference](../reference/convohop.md#projectserverclientoptions-class) describes.

## Sign in a user

ConvoHop doesn't authenticate your users. After your own login succeeds, map the user to a principal and issue a session for the device. Return the result to the user's app, which passes it to a client SDK, as the [TypeScript client quickstart](../../typescript/quickstarts/client.md) shows.

```cs snippet=docs/languages/dotnet/examples/src/Server.cs#bootstrap
// What your login endpoint returns, as JSON, to the signed-in user's app.
public sealed record UserBootstrap(
    Session Session, string SessionToken, string TokenExpiresAt, string BaseUrl, string ProjectId);

// Call this after your own authentication. accountId is your user's ID:
// never trust a principal ID that a browser sends.
public static async Task<UserBootstrap> BootstrapUserAsync(
    ProjectServerClient server, ServerConfig config, string accountId, string deviceId,
    CancellationToken cancellationToken)
{
    // The same principal on every login.
    Principal principal = await server.Principals.CreateAsync(accountId, cancellationToken: cancellationToken);
    SessionBootstrap issued = await server.Sessions.IssueAsync(
        principal.PrincipalId, deviceId, requestedTtlMs: "900000", cancellationToken: cancellationToken); // 15 minutes.
    // IssueAsync checks that the session is there, and that it's for this principal and device.
    return new UserBootstrap(issued.Session!, issued.SessionToken, issued.TokenExpiresAt, config.BaseUrl, config.ProjectId);
}
```

`Principals.CreateAsync` returns the same principal for the same external user ID, so call it on every login. A session token acts only as its principal.

## Create a conversation

Commands such as `Conversations.CreateAsync` take a request ID that identifies the action. Create one per action, for example with `Guid.NewGuid().ToString()`, and keep it until you know the outcome: [recover a lost response](#recover-a-lost-response) shows why.

```cs snippet=docs/languages/dotnet/examples/src/Server.cs#create-conversation
public static async Task<string> CreateConversationAsync(
    ProjectServerClient server, string title, IEnumerable<string> principalIds, string requestId,
    CancellationToken cancellationToken)
{
    var input = new CreateConversationRequestInput(
        title,
        JsonSerializer.SerializeToElement(new { }), // props: a JSON object of your own.
        principalIds.Select(principalId => new MemberInputInput(principalId, "member")).ToList());
    Conversation conversation = await server.Conversations.CreateAsync(input, requestId, cancellationToken);
    return conversation.ConversationId;
}
```

## Send and read messages

Your backend isn't a member of the conversation. To send or read as a member, pass `actAs` with the member's principal ID. The authority checks what that member can do and audits the call. Without it, the backend's own service principal sends the message.

```cs snippet=docs/languages/dotnet/examples/src/Server.cs#send-message
// Sends as a member. Without actAs, the backend's own principal is the sender.
public static async Task<string> SendAsAsync(
    ProjectServerClient server, string conversationId, string authorId, string text, string requestId,
    CancellationToken cancellationToken)
{
    MessageAck ack = await server.Conversation(conversationId).Messages.SendAsync(
        text, actAs: authorId, requestId: requestId, cancellationToken: cancellationToken);
    return ack.MessageId;
}
```

```cs snippet=docs/languages/dotnet/examples/src/Server.cs#list-messages
// Reads what one member can see, newest first.
public static async Task<IReadOnlyList<Message>> LatestMessagesAsync(
    ProjectServerClient server, string conversationId, string readerId, CancellationToken cancellationToken)
{
    MessagePage page = await server.Conversation(conversationId).Messages.ListAsync(
        limit: 20, actAs: readerId, cancellationToken: cancellationToken);
    return page.Items;
}
```

## Recover a lost response

When a connection drops after a command is sent, the SDK can't tell whether the authority committed it, so it throws a `ConvoHopException` whose `Outcome` is `"unknown"`. Sending again with a new request ID could post the message twice. Instead, `Requests.RetryAsync` asks the authority about the original request. If the authority never received it, `RetryAsync` resends the original command first. A `committed` resolution carries the command's result.

```cs snippet=docs/languages/dotnet/examples/src/Server.cs#recover
// A lost response leaves the outcome unknown: the message may or may not exist. Ask about the
// same request ID instead of sending with a new one, which could post the message twice.
public static async Task<string?> SendOnceAsync(
    ProjectServerClient server, string conversationId, string authorId, string text, string requestId,
    CancellationToken cancellationToken)
{
    try
    {
        return await SendAsAsync(server, conversationId, authorId, text, requestId, cancellationToken);
    }
    catch (ConvoHopException exception) when (exception.Outcome == "unknown")
    {
        // Resolves the request first, and resends the original only if the authority never saw it.
        RequestResolution resolution = await server.Requests.RetryAsync(requestId, cancellationToken);
        if (resolution.State != "committed") throw;
        return resolution.Receipt?.Result?.MessageAck?.MessageId;
    }
}
```

Retry with the same client, which keeps the original request in memory. It sends a request at most three times, within 60 seconds of the first attempt. To retry after a restart, set `RecoveryStorage` in the client's options, as [recovery](https://github.com/ConvoHop/sdks/blob/main/dotnet/README.md#recovery) describes. Recovery storage holds request inputs, never tokens or keys.

## Next steps

- [Webhooks quickstart](webhooks.md): react to events in your backend.
- [`ProjectServerClient` reference](../reference/convohop.md#projectserverclient-class): every method, with the operation it sends.
