# .NET webhooks quickstart

Receive ConvoHop events in your .NET backend: verify each signed delivery with `Webhooks.Verify`, acknowledge it quickly, and handle its event in a queue worker.

## Before you start

Create a webhook endpoint for your project with the [`management.configureWebhook`](../../operations/management/configureWebhook.md) operation, and choose the event types it receives. Its signing secret starts with `whsec_` and is delivered once, so keep it in your secret store. [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md) replaces it.

The samples use ASP.NET Core and these namespaces:

```cs include=examples/src/Webhooks.cs#usings
```

## Verify deliveries

ConvoHop signs each delivery with the [Standard Webhooks](https://www.standardwebhooks.com) scheme. `Webhooks.Verify` checks the signature and timestamp against the raw body, and returns the delivery's webhook ID and event. `WebhookHeaders.From` takes ASP.NET Core's `request.Headers`, an `HttpHeaders`, a dictionary or a lookup function.

```cs include=examples/src/Webhooks.cs#receive
```

- Pass every secret you hold. While a rotation is pending, ConvoHop signs with both the current and the next secret, and it signs with the replaced secret for 24 hours after the rotation.
- Verify the exact bytes you received, never re-serialized JSON. A body over 4096 bytes fails with `BodyTooLarge`, so the sample reads at most one byte more.
- Answer within 5 seconds, and process the event afterwards.
- Delivery is at least once, and retries keep the webhook ID, so deduplicate on it.
- A failed check throws `WebhookVerificationException`, whose `Code` names the check. Only `InvalidSecret` means your configuration is wrong. The [`WebhookVerificationCode` reference](../reference/convohop.md#webhookverificationcode-enum) lists the others.

## Handle events

Events carry IDs and metadata, not content, so read the current state through the API. Events arrive in any order.

```cs include=examples/src/Webhooks.cs#handle
```

`Webhooks.Verify` returns a `WebhookUnknownEvent`, whose `Known` is `false`, for an event type that this SDK version doesn't know, and for a notification event that doesn't match the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md). Skip those events rather than failing, as `HandleEventAsync` does.

Notification events, such as `notification.message`, are `WebhookNotificationEvent` subclasses. Each is addressed to one recipient and carries what a push notification needs. The [push notifications quickstart](push.md) sends them.

## Next steps

- [Push notifications quickstart](push.md): turn notification events into APNs, FCM and Web Push requests.
- [`WebhookEvent` reference](../reference/convohop.md#webhookevent-class): every event type and its fields.
