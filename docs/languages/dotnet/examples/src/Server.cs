// The server quickstart's samples. test/ServerTests.cs runs them against the conformance mock.

#region usings
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop;
using ConvoHop.Models;
#endregion usings

namespace Examples;

public static class ServerExamples
{
    #region connect
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
    #endregion connect

    #region bootstrap
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
    #endregion bootstrap

    #region create-conversation
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
    #endregion create-conversation

    #region send-message
    // Sends as a member. Without actAs, the backend's own principal is the sender.
    public static async Task<string> SendAsAsync(
        ProjectServerClient server, string conversationId, string authorId, string text, string requestId,
        CancellationToken cancellationToken)
    {
        MessageAck ack = await server.Conversation(conversationId).Messages.SendAsync(
            text, actAs: authorId, requestId: requestId, cancellationToken: cancellationToken);
        return ack.MessageId;
    }
    #endregion send-message

    #region list-messages
    // Reads what one member can see, newest first.
    public static async Task<IReadOnlyList<Message>> LatestMessagesAsync(
        ProjectServerClient server, string conversationId, string readerId, CancellationToken cancellationToken)
    {
        MessagePage page = await server.Conversation(conversationId).Messages.ListAsync(
            limit: 20, actAs: readerId, cancellationToken: cancellationToken);
        return page.Items;
    }
    #endregion list-messages

    #region recover
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
    #endregion recover
}
