# Go webhooks quickstart

Receive ConvoHop events in your Go backend with the `webhooks` package: verify each signed delivery, acknowledge it quickly, and handle its event in a queue worker.

## Before you start

Create a webhook endpoint for your project with the [`management.configureWebhook`](../../operations/management/configureWebhook.md) operation, and choose the event types it receives. Its signing secret starts with `whsec_` and is delivered once, so keep it in your secret store. [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md) replaces it.

The samples on this page use these imports:

```go include=examples/webhooks.go#imports
```

## Verify deliveries

ConvoHop signs each delivery with the [Standard Webhooks](https://www.standardwebhooks.com) scheme. `webhooks.Verify` checks the signature and timestamp against the raw body, and returns the delivery's webhook ID and event. It takes the request's `http.Header`, so it works in any `net/http` handler.

```go include=examples/webhooks.go#receive
```

- Pass every secret you hold. While a rotation is pending, ConvoHop signs with both the current and the next secret, and it signs with the replaced secret for 24 hours after the rotation.
- Verify the exact bytes you received, never re-encoded JSON. A body over 4096 bytes fails.
- Answer within 5 seconds, and process the event afterwards.
- Delivery is at least once, and retries keep the webhook ID, so deduplicate on it.
- A failed check returns a `*webhooks.Error`, whose `Code` names the check. Of the codes, only `INVALID_SECRET` means your configuration is wrong, and the [`webhooks.Code` reference](../reference/webhooks.md#code-enum) lists the others. An invalid option is a configuration error too, but returns a plain error.

## Handle events

Events carry IDs and metadata, not content, so read the current state through the API. Events arrive in any order.

```go include=examples/webhooks.go#handle
```

An event whose type this SDK version doesn't know has `Known` false. So does a notification event that doesn't match the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md), and its `Notification` is nil. Skip those events rather than failing, as `HandleEvent` does.

Notification events, such as `notification.message`, are addressed to one recipient and carry what a push notification needs in `Notification`. The [push notifications quickstart](push.md) sends them.

## Next steps

- [Push notifications quickstart](push.md): turn notification events into APNs, FCM and Web Push requests.
- [`webhooks.Event` reference](../reference/webhooks.md#event-struct): the fields of every event.
