# .NET webhooks quickstart

Receive ConvoHop events in your .NET backend: verify each signed delivery with `Webhooks.Verify`, acknowledge it quickly, and handle its event in a queue worker.

## Before you start

Create a webhook endpoint for your project with the [`management.configureWebhook`](../../operations/management/configureWebhook.md) operation, and choose the event types it receives. Its signing secret starts with `whsec_` and is delivered once, so keep it in your secret store. [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md) replaces it.

The samples use ASP.NET Core and these namespaces:

```cs snippet=docs/languages/dotnet/examples/src/Webhooks.cs#usings
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop;
using ConvoHop.Models;
using Microsoft.AspNetCore.Http;
```

## Verify deliveries

ConvoHop signs each delivery with the [Standard Webhooks](https://www.standardwebhooks.com) scheme. `Webhooks.Verify` checks the signature and timestamp against the raw body, and returns the delivery's webhook ID and event. `WebhookHeaders.From` takes ASP.NET Core's `request.Headers`, an `HttpHeaders`, a dictionary or a lookup function.

```cs snippet=docs/languages/dotnet/examples/src/Webhooks.cs#receive
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
```

- Pass every secret you hold. While a rotation is pending, ConvoHop signs with both the current and the next secret, and it signs with the replaced secret for 24 hours after the rotation.
- Verify the exact bytes you received, never re-serialized JSON. A body over 4096 bytes fails with `BodyTooLarge`, so the sample reads at most one byte more.
- Answer within 5 seconds, and process the event afterwards.
- Delivery is at least once, and retries keep the webhook ID, so deduplicate on it.
- A failed check throws `WebhookVerificationException`, whose `Code` names the check. Only `InvalidSecret` means your configuration is wrong. The [`WebhookVerificationCode` reference](../reference/convohop.md#webhookverificationcode-enum) lists the others.

## Handle events

Events carry IDs and metadata, not content, so read the current state through the API. Events arrive in any order.

```cs snippet=docs/languages/dotnet/examples/src/Webhooks.cs#handle
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
```

`Webhooks.Verify` returns a `WebhookUnknownEvent`, whose `Known` is `false`, for an event type that this SDK version doesn't know, and for a notification event that doesn't match the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md). Skip those events rather than failing, as `HandleEventAsync` does.

Notification events, such as `notification.message`, are `WebhookNotificationEvent` subclasses. Each is addressed to one recipient and carries what a push notification needs. The [push notifications quickstart](push.md) sends them.

## Next steps

- [Push notifications quickstart](push.md): turn notification events into APNs, FCM and Web Push requests.
- [`WebhookEvent` reference](../reference/convohop.md#webhookevent-class): every event type and its fields.
