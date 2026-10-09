package com.convohop.examples;

// #region imports
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
// #endregion imports

/** Webhooks quickstart snippets. WebhooksTest signs deliveries and posts them to the handler. */
public final class Webhooks {
  private Webhooks() {}

  // #region receive
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
  // #endregion receive

  // #region handle
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
  // #endregion handle
}
