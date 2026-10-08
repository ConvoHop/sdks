# TypeScript webhooks quickstart

Receive ConvoHop events in your backend with `@convohop/server`: verify each signed delivery, acknowledge it quickly, and handle its event in a queue worker.

## Before you start

Create a webhook endpoint for your project with the [`management.configureWebhook`](../../operations/management/configureWebhook.md) operation, and choose the event types it receives. Its signing secret starts with `whsec_` and is delivered once, so keep it in your secret store. [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md) replaces it.

## Verify deliveries

ConvoHop signs each delivery with the [Standard Webhooks](https://www.standardwebhooks.com) scheme. `webhooks.verify` checks the signature and timestamp against the raw body, and returns the event.

```ts include=examples/src/webhooks.ts#receive
```

- Pass every secret you hold. While a rotation is pending, ConvoHop signs with both the current and the next secret, and it signs with the replaced secret for 24 hours after the rotation.
- Answer within 5 seconds, and process the event afterwards.
- Delivery is at least once, and retries keep the webhook ID, so deduplicate on it.
- A failed check throws `WebhookVerificationError`, whose `code` names the check. Only `INVALID_SECRET` means your configuration is wrong. The [`webhooks` reference](../reference/server.md#webhooks-constant) lists the others.

## Handle events

Events carry IDs and metadata, not content, so read the current state through the API. Events arrive in any order.

```ts include=examples/src/webhooks.ts#handle
```

`event.known` is `false` for an event type that this SDK version doesn't know, and for a notification event that doesn't match the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md). Skip those events rather than failing, as `handleEvent` does.

Notification events, such as `notification.message`, are addressed to one recipient and carry what a push notification needs. The [push notifications quickstart](push.md) sends them.

## Next steps

- [Push notifications quickstart](push.md): turn notification events into APNs, FCM and Web Push requests.
- [`WebhookEvent` reference](../reference/server.md#webhookevent-type): every event type and its fields.
