using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop;
using ConvoHop.Models;
using Xunit;

namespace Examples.Tests;

[Collection("mock")]
public sealed class ServerTests(MockTarget mock)
{
    private static readonly CancellationToken None = CancellationToken.None;

    private sealed record Room(string Alice, string Bob, string ConversationId);

    private async Task<Room> SetUpAsync(ProjectServerClient server, string title)
    {
        ServerExamples.UserBootstrap alice = await ServerExamples.BootstrapUserAsync(
            server, mock.Config, $"alice-{Guid.NewGuid()}", Guid.NewGuid().ToString(), None);
        ServerExamples.UserBootstrap bob = await ServerExamples.BootstrapUserAsync(
            server, mock.Config, $"bob-{Guid.NewGuid()}", Guid.NewGuid().ToString(), None);
        string[] members = [alice.Session.PrincipalId, bob.Session.PrincipalId];
        string conversationId = await ServerExamples.CreateConversationAsync(server, title, members, Guid.NewGuid().ToString(), None);
        return new Room(members[0], members[1], conversationId);
    }

    [Fact]
    public async Task BootstrapUserReturnsTheSamePrincipalOnEveryLoginAndANewSession()
    {
        ProjectServerClient server = await ServerExamples.ConnectAsync(mock.Config, None);
        string accountId = $"carol-{Guid.NewGuid()}";
        ServerExamples.UserBootstrap first = await ServerExamples.BootstrapUserAsync(server, mock.Config, accountId, Guid.NewGuid().ToString(), None);
        ServerExamples.UserBootstrap second = await ServerExamples.BootstrapUserAsync(server, mock.Config, accountId, Guid.NewGuid().ToString(), None);

        Assert.Equal(first.Session.PrincipalId, second.Session.PrincipalId);
        Assert.NotEqual(first.SessionToken, second.SessionToken);
        Assert.Equal(mock.CommunicationUrl, first.BaseUrl);
        Assert.Equal(mock.ProjectId, first.ProjectId);
        Assert.Equal(mock.Incarnation, first.Session.Incarnation);

        // ASP.NET Core returns it as JSON with web defaults: the client SDK's SessionBootstrap, plus baseUrl and projectId.
        using JsonDocument json = JsonDocument.Parse(JsonSerializer.Serialize(first, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
        Assert.Equal(
            new[] { "session", "sessionToken", "tokenExpiresAt", "baseUrl", "projectId" },
            json.RootElement.EnumerateObject().Select(property => property.Name));
        Assert.Equal(first.Session.PrincipalId, json.RootElement.GetProperty("session").GetProperty("principalId").GetString());
    }

    [Fact]
    public async Task MessagesAreListedForTheOtherMemberNewestFirst()
    {
        ProjectServerClient server = await ServerExamples.ConnectAsync(mock.Config, None);
        Room room = await SetUpAsync(server, "Launch plan");
        string question = await ServerExamples.SendAsAsync(server, room.ConversationId, room.Alice, "Ship it on Monday?", Guid.NewGuid().ToString(), None);
        string answer = await ServerExamples.SendAsAsync(server, room.ConversationId, room.Bob, "Monday works.", Guid.NewGuid().ToString(), None);

        IReadOnlyList<Message> messages = await ServerExamples.LatestMessagesAsync(server, room.ConversationId, room.Bob, None);

        Assert.Equal(
            new (string, string, string?)[] { (answer, room.Bob, "Monday works."), (question, room.Alice, "Ship it on Monday?") },
            messages.Select(message => (message.MessageId, message.AuthorId, message.Text)));
    }

    [Theory]
    [InlineData("dropBeforeCommit", new[] { true, false })]
    [InlineData("dropAfterCommit", new[] { true })]
    public async Task SendOncePostsExactlyOneMessageWhenTheConnectionDrops(string action, bool[] expectedAttempts)
    {
        ProjectServerClient server = await ServerExamples.ConnectAsync(mock.Config, None);
        Room room = await SetUpAsync(server, $"Lost reply {action}");
        await mock.InjectFaultAsync("sendMessage", action);
        string requestId = Guid.NewGuid().ToString();

        string? messageId = await ServerExamples.SendOnceAsync(server, room.ConversationId, room.Alice, "Did it land?", requestId, None);
        IReadOnlyList<Message> messages = await ServerExamples.LatestMessagesAsync(server, room.ConversationId, room.Bob, None);

        Assert.NotNull(messageId);
        Assert.Equal(
            new (string?, string?)[] { (messageId, "Did it land?") },
            messages.Select(message => ((string?)message.MessageId, message.Text)));
        // The first attempt was dropped. Only a request that never reached the authority is sent again.
        Assert.Equal(expectedAttempts, await mock.AttemptsAsync("sendMessage", requestId));
    }
}
