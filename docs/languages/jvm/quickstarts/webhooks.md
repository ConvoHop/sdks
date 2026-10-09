# Java and Kotlin webhooks quickstart

Receive ConvoHop events in your Java or Kotlin backend with `convohop-server`: verify each signed delivery, acknowledge it quickly, and handle its event in a queue worker.

## Before you start

Create a webhook endpoint for your project with the [`management.configureWebhook`](../../operations/management/configureWebhook.md) operation, and choose the event types it receives. Its signing secret starts with `whsec_` and is delivered once, so keep it in your secret store. [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md) replaces it.

The samples on this page use these imports:

```java include=examples/src/main/java/com/convohop/examples/Webhooks.java#imports
```

## Verify deliveries

ConvoHop signs each delivery with the [Standard Webhooks](https://www.standardwebhooks.com) scheme. `WebhookVerifier` checks the signature and timestamp against the raw body, and returns the event. `receive` works with any HTTP framework, and `webhookHandler` serves it with the JDK's HTTP server.

```java include=examples/src/main/java/com/convohop/examples/Webhooks.java#receive
```

- Pass every secret you hold. While a rotation is pending, ConvoHop signs with both the current and the next secret, and it signs with the replaced secret for 24 hours after the rotation.
- Verify the exact bytes you received, never re-serialized JSON. A body over 4096 bytes fails.
- Answer within 5 seconds, and process the event afterwards.
- Delivery is at least once, and retries keep the webhook ID, so deduplicate on it.
- A failed check throws `WebhookVerificationException`, whose `getCode()` names the check. Only `INVALID_SECRET`, which `build()` throws, means your configuration is wrong. The [`WebhookVerificationException` reference](../reference/server.md#webhookverificationexception-class) lists the others.

`WebhookHeaders` reads a header's values, and matches names without regard to case. Adapt your framework's headers with a lambda, such as `name -> Collections.list(request.getHeaders(name))` in a servlet or `httpHeaders::allValues` for `java.net.http.HttpHeaders`, or with `WebhookHeaders.of` or `WebhookHeaders.ofMultiValued` for a map.

## Handle events

Events carry IDs and metadata, not content, so read the current state through the API. Events arrive in any order.

```java include=examples/src/main/java/com/convohop/examples/Webhooks.java#handle
```

`isKnown()` is `false` for an event type that this SDK version doesn't know, and for a notification event that doesn't match the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md). Both are `WebhookUnknownEvent`. Skip those events rather than failing, as `handleEvent` does.

Notification events, such as `notification.message`, are `WebhookNotificationEvent` subclasses. Each is addressed to one recipient and carries what a push notification needs. The [push notifications quickstart](push.md) sends them.

## Next steps

- [Push notifications quickstart](push.md): turn notification events into APNs, FCM and Web Push requests.
- [`WebhookEvent` reference](../reference/server.md#webhookevent-class): every event class and its getters.
