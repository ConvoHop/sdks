package com.convohop.examples;

import static com.convohop.server.testing.Fixtures.map;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.convohop.server.ProjectServerClient;
import com.convohop.server.internal.Json;
import com.convohop.server.model.Conversation;
import com.convohop.server.testing.Repo;
import com.convohop.server.webhooks.WebhookEvent;
import com.convohop.server.webhooks.WebhookNotificationEvent;
import com.convohop.server.webhooks.WebhookVerificationCode;
import com.convohop.server.webhooks.WebhookVerificationException;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class WebhooksTest {
  private static Mock mock;

  @BeforeAll
  static void start() throws IOException {
    mock = Mock.start();
  }

  @AfterAll
  static void stop() {
    mock.close();
  }

  /** A delivery that the endpoint enqueued. */
  private static final class Delivery {
    final String webhookId;
    final WebhookEvent event;

    Delivery(String webhookId, WebhookEvent event) {
      this.webhookId = webhookId;
      this.event = event;
    }
  }

  /** {@link Webhooks#webhookHandler} on the JDK's HTTP server, with an in-memory queue. */
  private static final class Endpoint implements AutoCloseable {
    final List<Delivery> received = new CopyOnWriteArrayList<>();
    private final HttpServer server;
    private final URI uri;

    Endpoint(String... secrets) throws IOException {
      server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
      server.createContext("/webhooks/convohop", Webhooks.webhookHandler(
          Webhooks.verifier(Arrays.asList(secrets)),
          (webhookId, event) -> received.add(new Delivery(webhookId, event))));
      server.start();
      uri = URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/webhooks/convohop");
    }

    /** Posts a delivery and returns the response's status code. */
    int post(Map<String, String> headers, String body) throws IOException, InterruptedException {
      HttpRequest.Builder request = HttpRequest.newBuilder(uri).POST(HttpRequest.BodyPublishers.ofString(body));
      headers.forEach(request::header);
      return Mock.HTTP.send(request.build(), HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    /** Signs an event with a secret and posts it. */
    int deliver(String webhookId, Map<String, Object> event, String secret) throws IOException, InterruptedException {
      String body = Json.stringify(event);
      return post(Deliveries.sign(webhookId, body, secret), body);
    }

    Delivery last() {
      return received.get(received.size() - 1);
    }

    @Override
    public void close() {
      server.stop(0);
    }
  }

  private static Map<String, Object> envelope(String eventType, String kind, String id) {
    return map("eventId", UUID.randomUUID().toString(), "eventType", eventType, "occurredAt", Instant.now().toString(),
        "projectId", mock.projectId, "subjectRef", map("kind", kind, "id", id));
  }

  @Test
  void theHandlerAcceptsASignedDeliveryIncludingDuringASecretRotation() throws Exception {
    String current = Deliveries.newSecret();
    String next = Deliveries.newSecret();
    String conversationId = UUID.randomUUID().toString();
    Map<String, Object> event = envelope("conversation.created", "conversation", conversationId);
    try (Endpoint endpoint = new Endpoint(current, next)) {
      for (String secret : List.of(current, next)) {
        String webhookId = Deliveries.newWebhookId();
        assertEquals(204, endpoint.deliver(webhookId, event, secret));
        assertEquals(webhookId, endpoint.last().webhookId);
      }
      WebhookEvent received = endpoint.received.get(0).event;
      assertTrue(received.isKnown());
      assertEquals(
          List.of(event.get("eventId"), "conversation.created", event.get("occurredAt"), mock.projectId,
              "conversation", conversationId),
          List.of(received.getEventId(), received.getEventType(), received.getOccurredAt(), received.getProjectId(),
              received.getSubjectRef().getKind(), received.getSubjectRef().getId()));
    }
  }

  @Test
  void theHandlerAnswers400WithoutEnqueuingADeliveryThatFailsVerification() throws Exception {
    String secret = Deliveries.newSecret();
    Map<String, Object> event = envelope("message.created", "message", UUID.randomUUID().toString());
    String body = Json.stringify(event);
    try (Endpoint endpoint = new Endpoint(secret)) {
      Map<String, Object> deleted = map();
      deleted.putAll(event);
      deleted.put("eventType", "message.deleted");
      Map<String, String> signed = Deliveries.sign(Deliveries.newWebhookId(), body, secret);
      assertEquals(400, endpoint.post(signed, Json.stringify(deleted)), "tampered");
      assertEquals(400, endpoint.deliver(Deliveries.newWebhookId(), event, Deliveries.newSecret()), "wrong secret");
      assertEquals(400, endpoint.post(Map.of("content-type", "application/json"), body), "unsigned");
      Map<String, Object> large = map();
      large.putAll(event);
      large.put("padding", "x".repeat(4096));
      assertEquals(400, endpoint.deliver(Deliveries.newWebhookId(), large, secret), "over 4096 bytes");
      assertTrue(endpoint.received.isEmpty());
    }
  }

  @Test
  void aMalformedSecretFailsWhenTheVerifierIsBuilt() {
    WebhookVerificationException error =
        assertThrows(WebhookVerificationException.class, () -> Webhooks.verifier(List.of("not-a-webhook-secret")));
    assertEquals(WebhookVerificationCode.INVALID_SECRET, error.getCode());
  }

  @Test
  void handleEventReadsChangedConversationsAndRoutesNotifications() throws Exception {
    ProjectServerClient server = mock.connect();
    String alice = mock.login(server, "alice");
    String conversationId = Server.createConversation(server, "Webhooks", List.of(alice), UUID.randomUUID().toString());
    Map<String, Object> notification = null;
    for (Object vector : Repo.list(Repo.object(Repo.json("spec/push-payload/vectors.json")).get("vectors"))) {
      Map<String, Object> event = Repo.object(Repo.object(vector).get("event"));
      if ("notification.message".equals(event.get("eventType"))) {
        notification = event;
        break;
      }
    }
    assertTrue(notification != null);

    String secret = Deliveries.newSecret();
    try (Endpoint endpoint = new Endpoint(secret)) {
      for (Map<String, Object> event : List.of(
          envelope("conversation.created", "conversation", conversationId),
          envelope("message.created", "message", UUID.randomUUID().toString()),
          notification,
          envelope("webhook.endpointDisabled", "webhookEndpoint", "endpoint-orders"),
          envelope("thread.archived", "thread", UUID.randomUUID().toString()))) { // A type from a newer ConvoHop.
        assertEquals(204, endpoint.deliver(Deliveries.newWebhookId(), event, secret));
      }

      List<List<Object>> calls = new ArrayList<>();
      Webhooks.EventHandlers handlers = new Webhooks.EventHandlers() {
        @Override
        public void conversationChanged(Conversation conversation) {
          calls.add(List.of("conversationChanged", conversation.getConversationId(), conversation.getTitle()));
        }

        @Override
        public void push(WebhookNotificationEvent event) {
          calls.add(List.of("push", event));
        }

        @Override
        public void endpointDisabled(String endpointId) {
          calls.add(List.of("endpointDisabled", endpointId));
        }
      };
      for (Delivery delivery : endpoint.received) {
        Webhooks.handleEvent(server, delivery.event, handlers);
      }
      assertEquals(
          List.of(
              List.of("conversationChanged", conversationId, "Webhooks"),
              List.of("push", endpoint.received.get(2).event),
              List.of("endpointDisabled", "endpoint-orders")),
          calls);
      assertTrue(endpoint.received.get(2).event.isKnown());
      assertFalse(endpoint.received.get(4).event.isKnown());
    }
  }
}
