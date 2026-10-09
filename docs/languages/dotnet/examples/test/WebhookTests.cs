using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop;
using ConvoHop.Models;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Examples.Tests;

[Collection("mock")]
public sealed class WebhookTests(MockTarget mock)
{
    private static readonly CancellationToken None = CancellationToken.None;

    private sealed class Queue
    {
        public List<(string WebhookId, WebhookEvent Event)> Received { get; } = [];

        public void Enqueue(string webhookId, WebhookEvent webhookEvent) => Received.Add((webhookId, webhookEvent));
    }

    private sealed class RecordingHandlers : WebhookExamples.IEventHandlers
    {
        public List<string> Calls { get; } = [];
        public List<WebhookNotificationEvent> Notified { get; } = [];

        public void ConversationChanged(Conversation conversation) =>
            Calls.Add($"ConversationChanged {conversation.ConversationId} {conversation.Title}");

        public void Notify(WebhookNotificationEvent notification)
        {
            Calls.Add($"Notify {notification.EventId}");
            Notified.Add(notification);
        }

        public void EndpointDisabled(string endpointId) => Calls.Add($"EndpointDisabled {endpointId}");
    }

    // The status code that ASP.NET Core answers with.
    private static async Task<int?> ReceiveAsync(Delivery delivery, IEnumerable<string> secrets, Queue queue)
    {
        IResult result = await WebhookExamples.ReceiveAsync(delivery.ToRequest(), secrets, queue.Enqueue, None);
        return Assert.IsAssignableFrom<IStatusCodeHttpResult>(result).StatusCode;
    }

    [Fact]
    public async Task ReceiveAcceptsASignedDeliveryIncludingDuringASecretRotation()
    {
        string current = Deliveries.NewSecret(), upcoming = Deliveries.NewSecret();
        var queue = new Queue();
        JsonObject sent = Deliveries.Envelope("conversation.created", "conversation", Guid.NewGuid().ToString());
        foreach (string secret in new[] { current, upcoming })
        {
            Delivery delivery = Deliveries.Sign(sent, secret);
            Assert.Equal(204, await ReceiveAsync(delivery, [current, upcoming], queue));
            Assert.Equal(delivery.WebhookId, queue.Received[^1].WebhookId);
        }

        WebhookResourceEvent received = Assert.IsType<WebhookResourceEvent>(queue.Received[0].Event);
        Assert.True(received.Known);
        var parsed = new JsonObject
        {
            ["eventId"] = received.EventId,
            ["eventType"] = received.EventType,
            ["occurredAt"] = received.OccurredAt,
            ["projectId"] = received.ProjectId,
            ["subjectRef"] = new JsonObject { ["kind"] = received.SubjectRef.Kind, ["id"] = received.SubjectRef.Id },
        };
        Assert.Equal(sent.ToJsonString(), parsed.ToJsonString());
    }

    [Fact]
    public async Task ReceiveAnswers400WithoutEnqueuingADeliveryThatFailsVerification()
    {
        string secret = Deliveries.NewSecret();
        var queue = new Queue();
        JsonObject sent = Deliveries.Envelope("message.created", "message", Guid.NewGuid().ToString());
        var altered = (JsonObject)sent.DeepClone();
        altered["eventType"] = "message.deleted";

        Delivery tampered = Deliveries.Sign(sent, secret, body: Deliveries.WireJson(altered));
        Assert.Equal(400, await ReceiveAsync(tampered, [secret], queue));
        Delivery wrongSecret = Deliveries.Sign(sent, Deliveries.NewSecret());
        Assert.Equal(400, await ReceiveAsync(wrongSecret, [secret], queue));
        var unsigned = new Delivery(
            "", new Dictionary<string, string> { ["content-type"] = "application/json" }, Encoding.UTF8.GetBytes(Deliveries.WireJson(sent)));
        Assert.Equal(400, await ReceiveAsync(unsigned, [secret], queue));
        Assert.Empty(queue.Received);
    }

    [Fact]
    public async Task ReceiveThrowsWhenItsOwnSecretIsMisconfigured()
    {
        Delivery delivery = Deliveries.Sign(
            Deliveries.Envelope("conversation.created", "conversation", Guid.NewGuid().ToString()), Deliveries.NewSecret());

        var exception = await Assert.ThrowsAsync<WebhookVerificationException>(
            () => ReceiveAsync(delivery, ["not-a-webhook-secret"], new Queue()));
        Assert.Equal(WebhookVerificationCode.InvalidSecret, exception.Code);
    }

    [Fact]
    public async Task HandleEventReadsChangedConversationsAndRoutesNotifications()
    {
        JsonNode notification = Vectors.Push()
            .Select(vector => vector["event"]!)
            .First(@event => (string?)@event["eventType"] == "notification.message");
        ProjectServerClient server = await ServerExamples.ConnectAsync(mock.Config, None);
        ServerExamples.UserBootstrap login = await ServerExamples.BootstrapUserAsync(
            server, mock.Config, $"alice-{Guid.NewGuid()}", Guid.NewGuid().ToString(), None);
        string conversationId = await ServerExamples.CreateConversationAsync(
            server, "Webhooks", [login.Session.PrincipalId], Guid.NewGuid().ToString(), None);

        string secret = Deliveries.NewSecret();
        var queue = new Queue();
        foreach (JsonNode @event in new[]
        {
            Deliveries.Envelope("conversation.created", "conversation", conversationId, mock.ProjectId),
            Deliveries.Envelope("message.created", "message", Guid.NewGuid().ToString(), mock.ProjectId),
            notification,
            Deliveries.Envelope("webhook.endpointDisabled", "webhookEndpoint", "endpoint-orders", mock.ProjectId),
            Deliveries.Envelope("thread.archived", "thread", Guid.NewGuid().ToString(), mock.ProjectId), // A type from a newer ConvoHop.
        })
        {
            Assert.Equal(204, await ReceiveAsync(Deliveries.Sign(@event, secret), [secret], queue));
        }

        var handlers = new RecordingHandlers();
        foreach ((string _, WebhookEvent received) in queue.Received)
            await WebhookExamples.HandleEventAsync(server, received, handlers, None);

        Assert.Equal(
            new[]
            {
                $"ConversationChanged {conversationId} Webhooks",
                $"Notify {queue.Received[2].Event.EventId}",
                "EndpointDisabled endpoint-orders",
            },
            handlers.Calls);
        Assert.Same(queue.Received[2].Event, Assert.Single(handlers.Notified));
        Assert.True(queue.Received[2].Event.Known);
        Assert.IsType<WebhookUnknownEvent>(queue.Received[4].Event);
        Assert.False(queue.Received[4].Event.Known);
    }
}
