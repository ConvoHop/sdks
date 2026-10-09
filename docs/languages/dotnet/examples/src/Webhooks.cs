// The webhooks quickstart's samples. test/WebhookTests.cs signs deliveries and runs them.

#region usings
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop;
using ConvoHop.Models;
using Microsoft.AspNetCore.Http;
#endregion usings

namespace Examples;

public static class WebhookExamples
{
    #region receive
    // Map it to your endpoint's URL in ASP.NET Core, and enqueue the events for your queue worker:
    // app.MapPost("/webhooks/convohop", (HttpRequest request, CancellationToken cancellationToken) =>
    //     WebhookExamples.ReceiveAsync(request, secrets, queue.Enqueue, cancellationToken));
    // secrets are the endpoint's whsec_ secrets from your secret store. Pass every one you hold, so
    // deliveries keep verifying during a secret rotation.
    public static async Task<IResult> ReceiveAsync(
        HttpRequest request, IEnumerable<string> secrets, Action<string, WebhookEvent> enqueue,
        CancellationToken cancellationToken)
    {
        // The raw bytes, never re-serialized JSON. Read one byte over the 4096-byte limit, so a
        // larger body fails verification with BodyTooLarge.
        var body = new byte[4097];
        int length = 0, read;
        while (length < body.Length && (read = await request.Body.ReadAsync(body.AsMemory(length), cancellationToken)) > 0)
            length += read;
        VerifiedWebhookDelivery delivery;
        try
        {
            delivery = Webhooks.Verify(WebhookHeaders.From(request.Headers), body.AsSpan(0, length), secrets);
        }
        // InvalidSecret means your configuration is wrong, so let it fail loudly instead of answering 400.
        catch (WebhookVerificationException exception) when (exception.Code != WebhookVerificationCode.InvalidSecret)
        {
            return Results.BadRequest();
        }
        // Respond within 5 seconds and process later. Deduplicate on WebhookId: delivery is at least once.
        enqueue(delivery.WebhookId, delivery.Event);
        return Results.NoContent();
    }
    #endregion receive

    #region handle
    // What your app does with the events it subscribes to.
    public interface IEventHandlers
    {
        void ConversationChanged(Conversation conversation);
        void Notify(WebhookNotificationEvent notification); // Push to the recipient's devices.
        void EndpointDisabled(string endpointId);
    }

    // Your queue worker. Events arrive at least once and in any order.
    public static async Task HandleEventAsync(
        ProjectServerClient server, WebhookEvent webhookEvent, IEventHandlers handlers, CancellationToken cancellationToken)
    {
        switch (webhookEvent)
        {
            case WebhookResourceEvent { EventType: WebhookEventTypes.ConversationCreated or WebhookEventTypes.ConversationUpdated }:
                // Events carry only IDs. Read the current state through the API.
                handlers.ConversationChanged(await server.Conversation(webhookEvent.SubjectRef.Id).GetAsync(cancellationToken));
                break;
            case WebhookNotificationEvent notification:
                handlers.Notify(notification);
                break;
            case WebhookEndpointDisabledEvent:
                handlers.EndpointDisabled(webhookEvent.SubjectRef.Id); // Another of your endpoints kept failing.
                break;
            default:
                // Other event types your endpoint subscribes to, and types this SDK doesn't know yet
                // (WebhookUnknownEvent, whose Known is false). Acknowledge them and move on.
                break;
        }
    }
    #endregion handle
}
