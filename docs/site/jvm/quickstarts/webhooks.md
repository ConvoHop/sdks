# Java and Kotlin webhooks quickstart

Receive ConvoHop events in your Java or Kotlin backend with `convohop-server`: verify each signed delivery, acknowledge it quickly, and handle its event in a queue worker.

## Before you start

Create a webhook endpoint for your project with the [`management.configureWebhook`](../../operations/management/configureWebhook.md) operation, and choose the event types it receives. Its signing secret starts with `whsec_` and is delivered once, so keep it in your secret store. [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md) replaces it.

The samples on this page use these imports:

```java snippet=docs/languages/jvm/examples/src/main/java/com/convohop/examples/Webhooks.java#imports
import com.convohop.server.ProjectServerClient;
import com.convohop.server.model.Conversation;
import com.convohop.server.webhooks.VerifiedWebhook;
import com.convohop.server.webhooks.WebhookEvent;
import com.convohop.server.webhooks.WebhookHeaders;
import com.convohop.server.webhooks.WebhookNotificationEvent;
import com.convohop.server.webhooks.WebhookVerificationException;
import com.convohop.server.webhooks.WebhookVerifier;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.function.BiConsumer;
```

## Verify deliveries

ConvoHop signs each delivery with the [Standard Webhooks](https://www.standardwebhooks.com) scheme. `WebhookVerifier` checks the signature and timestamp against the raw body, and returns the event. `receive` works with any HTTP framework, and `webhookHandler` serves it with the JDK's HTTP server.

```java snippet=docs/languages/jvm/examples/src/main/java/com/convohop/examples/Webhooks.java#receive
// secrets are the endpoint's whsec_ secrets from your secret store. Pass every one you hold, so
// deliveries keep verifying during a secret rotation. build() throws a WebhookVerificationException
// with code INVALID_SECRET if one is malformed, so build the verifier once, when your app starts.
public static WebhookVerifier verifier(List<String> secrets) {
  return WebhookVerifier.builder().secrets(secrets).build();
}

// Your endpoint, in any HTTP framework: pass the request's headers and body, and answer with the
// status code this returns. enqueue takes the delivery's webhook ID and event.
public static int receive(
    WebhookVerifier verifier, WebhookHeaders headers, InputStream body, BiConsumer<String, WebhookEvent> enqueue)
    throws IOException {
  // The raw bytes, never re-serialized JSON. One byte over the 4096-byte limit is enough to
  // reject a larger body as BODY_TOO_LARGE.
  byte[] bytes = body.readNBytes(4097);
  VerifiedWebhook delivery;
  try {
    delivery = verifier.verify(headers, bytes);
  } catch (WebhookVerificationException rejected) {
    return 400;
  }
  // Respond within 5 seconds and process later. Deduplicate on the webhook ID: delivery is at least once.
  enqueue.accept(delivery.getWebhookId(), delivery.getEvent());
  return 204;
}

// With the JDK's HTTP server: server.createContext("/webhooks/convohop", webhookHandler(verifier, enqueue)).
public static HttpHandler webhookHandler(WebhookVerifier verifier, BiConsumer<String, WebhookEvent> enqueue) {
  return exchange -> {
    try {
      WebhookHeaders headers = WebhookHeaders.ofMultiValued(exchange.getRequestHeaders());
      int status = receive(verifier, headers, exchange.getRequestBody(), enqueue);
      exchange.sendResponseHeaders(status, -1); // No response body.
    } finally {
      exchange.close();
    }
  };
}
```

- Pass every secret you hold. While a rotation is pending, ConvoHop signs with both the current and the next secret, and it signs with the replaced secret for 24 hours after the rotation.
- Verify the exact bytes you received, never re-serialized JSON. A body over 4096 bytes fails.
- Answer within 5 seconds, and process the event afterwards.
- Delivery is at least once, and retries keep the webhook ID, so deduplicate on it.
- A failed check throws `WebhookVerificationException`, whose `getCode()` names the check. Only `INVALID_SECRET`, which `build()` throws, means your configuration is wrong. The [`WebhookVerificationException` reference](../reference/server.md#webhookverificationexception-class) lists the others.

`WebhookHeaders` reads a header's values, and matches names without regard to case. Adapt your framework's headers with a lambda, such as `name -> Collections.list(request.getHeaders(name))` in a servlet or `httpHeaders::allValues` for `java.net.http.HttpHeaders`, or with `WebhookHeaders.of` or `WebhookHeaders.ofMultiValued` for a map.

## Handle events

Events carry IDs and metadata, not content, so read the current state through the API. Events arrive in any order.

```java snippet=docs/languages/jvm/examples/src/main/java/com/convohop/examples/Webhooks.java#handle
// What your app does with the events it subscribes to.
public interface EventHandlers {
  void conversationChanged(Conversation conversation);

  void push(WebhookNotificationEvent event); // Push to the recipient's devices.

  void endpointDisabled(String endpointId);
}

// Your queue worker. Events arrive at least once and in any order.
public static void handleEvent(ProjectServerClient server, WebhookEvent event, EventHandlers handlers) {
  if (!event.isKnown()) {
    return; // A type this SDK doesn't know yet. Acknowledge it and move on.
  }
  if (event instanceof WebhookNotificationEvent) { // notification.message, .call or .callCancelled
    handlers.push((WebhookNotificationEvent) event);
    return;
  }
  switch (event.getEventType()) {
    case "conversation.created":
    case "conversation.updated":
      // Events carry only IDs. Read the current state through the API.
      handlers.conversationChanged(server.conversation(event.getSubjectRef().getId()).get());
      break;
    case "webhook.endpointDisabled":
      handlers.endpointDisabled(event.getSubjectRef().getId()); // Another of your endpoints kept failing.
      break;
    default:
      break; // Other event types your endpoint subscribes to.
  }
}
```

`isKnown()` is `false` for an event type that this SDK version doesn't know, and for a notification event that doesn't match the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md). Both are `WebhookUnknownEvent`. Skip those events rather than failing, as `handleEvent` does.

Notification events, such as `notification.message`, are `WebhookNotificationEvent` subclasses. Each is addressed to one recipient and carries what a push notification needs. The [push notifications quickstart](push.md) sends them.

## Next steps

- [Push notifications quickstart](push.md): turn notification events into APNs, FCM and Web Push requests.
- [`WebhookEvent` reference](../reference/server.md#webhookevent-class): every event class and its getters.
