package com.convohop.examples;

import static com.convohop.server.testing.Fixtures.map;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.convohop.server.internal.Json;
import com.convohop.server.push.ApnsRequest;
import com.convohop.server.push.FcmRequest;
import com.convohop.server.push.PushOptions;
import com.convohop.server.push.PushPayloads;
import com.convohop.server.push.WebPushRequest;
import com.convohop.server.testing.Repo;
import com.convohop.server.webhooks.WebhookEvent;
import com.convohop.server.webhooks.WebhookHeaders;
import com.convohop.server.webhooks.WebhookNotificationEvent;
import com.convohop.server.webhooks.WebhookVerifier;
import com.google.api.client.http.LowLevelHttpRequest;
import com.google.api.client.testing.http.MockHttpTransport;
import com.google.api.client.testing.http.MockLowLevelHttpRequest;
import com.google.api.client.testing.http.MockLowLevelHttpResponse;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.Test;

class PushTest {
  private static final String SUBSCRIPTION = Json.stringify(map("endpoint", "https://push.example/send/subscription-1",
      "keys", map("p256dh", "subscription-public-key", "auth", "subscription-auth-secret")));
  private static final Push.FcmTarget ANDROID_TOKEN = Push.FcmTarget.token("android-token");
  private static final Push.FcmTarget ANDROID_FID = Push.FcmTarget.fid("android-fid");
  private static final List<Push.Device> DEVICES = List.of(
      new Push.IosDevice("ios-token", null),
      new Push.IosDevice("callkit-token", "callkit-voip-token"),
      new Push.AndroidDevice(ANDROID_TOKEN),
      new Push.AndroidDevice(ANDROID_FID),
      new Push.WebDevice(SUBSCRIPTION));

  /** The event as your webhook endpoint receives it. */
  private static WebhookNotificationEvent received(Map<String, Object> event) {
    String secret = Deliveries.newSecret();
    String body = Json.stringify(event);
    WebhookHeaders headers = WebhookHeaders.of(Deliveries.sign(Deliveries.newWebhookId(), body, secret));
    WebhookEvent verified = WebhookVerifier.builder().secrets(secret).build().verify(headers, body).getEvent();
    return assertInstanceOf(WebhookNotificationEvent.class, verified);
  }

  private static PushOptions options(Map<String, Object> vector) {
    Map<String, Object> settings = Repo.object(vector.get("options"));
    PushOptions.Builder options = PushOptions.builder()
        .clock(Clock.fixed(Instant.ofEpochSecond((Long) vector.get("nowSeconds")), ZoneOffset.UTC));
    if (settings.containsKey("title")) {
      options.title((String) settings.get("title"));
    }
    if (settings.containsKey("body")) {
      options.body((String) settings.get("body"));
    }
    if (settings.containsKey("preview")) {
      options.preview((Boolean) settings.get("preview"));
    }
    return options.build();
  }

  /** The request a vector expects from a builder, in the contract's JSON shape, or null for none. */
  private static @Nullable Object expected(Map<String, Object> vector, String builder) {
    Object result = Repo.object(vector.get("expected")).get(builder);
    return result == null ? null : Repo.object(result).get("request");
  }

  private static List<Object> vectors() {
    List<Object> vectors = Repo.list(Repo.object(Repo.json("spec/push-payload/vectors.json")).get("vectors"));
    assertFalse(vectors.isEmpty());
    return vectors;
  }

  @Test
  void notifyDevicesSendsEachDeviceTheRequestThePushPayloadVectorsExpect() {
    for (Object item : vectors()) {
      Map<String, Object> vector = Repo.object(item);
      List<List<Object>> sent = new ArrayList<>();
      Push.PushSenders senders = new Push.PushSenders() {
        @Override
        public void apns(String token, ApnsRequest request) {
          sent.add(List.of("apns", token, map("headers", request.getHeaders(), "payload", payload(request.getPayload()))));
        }

        @Override
        public void fcm(Push.FcmTarget target, FcmRequest request) {
          sent.add(List.of("fcm", target, map("message", payload(request.getMessage()))));
        }

        @Override
        public void webPush(String subscription, WebPushRequest request) {
          sent.add(List.of("webPush", subscription,
              map("headers", request.getHeaders(), "payload", payload(request.getPayload()))));
        }
      };
      String bundleId = (String) Repo.object(vector.get("options")).get("bundleId");
      Push.notifyDevices(received(Repo.object(vector.get("event"))), DEVICES, senders, bundleId, options(vector));

      Object alert = expected(vector, "apnsAlert");
      Object voip = expected(vector, "apnsVoip");
      Object fcm = expected(vector, "fcm");
      Object webPush = expected(vector, "webPush");
      List<List<Object>> want = new ArrayList<>();
      if (alert != null) {
        want.add(List.of("apns", "ios-token", alert));
      }
      if (voip != null) {
        want.add(List.of("apns", "callkit-voip-token", voip));
      } else if (alert != null) {
        want.add(List.of("apns", "callkit-token", alert));
      }
      if (fcm != null) {
        want.add(List.of("fcm", ANDROID_TOKEN, fcm));
        want.add(List.of("fcm", ANDROID_FID, fcm));
      }
      if (webPush != null) {
        want.add(List.of("webPush", SUBSCRIPTION, webPush));
      }
      assertEquals(want, sent, (String) vector.get("id"));
    }
  }

  /** FCM as the Firebase Admin SDK reaches it: records each request and answers with a message ID. */
  private static final class MockFcm extends MockHttpTransport {
    final List<MockLowLevelHttpRequest> requests = new ArrayList<>();

    @Override
    public LowLevelHttpRequest buildRequest(String method, String url) {
      MockLowLevelHttpRequest request = new MockLowLevelHttpRequest(url).setResponse(new MockLowLevelHttpResponse()
          .setContentType("application/json; charset=UTF-8")
          .setContent("{\"name\":\"projects/mock-project/messages/" + requests.size() + "\"}"));
      requests.add(request);
      return request;
    }

    /** Sends request to target with Push.sendFcm, and returns the message as FCM receives it. */
    Map<String, Object> send(FirebaseMessaging messaging, Push.FcmTarget target, FcmRequest request)
        throws Exception {
      String messageId = "projects/mock-project/messages/" + requests.size();
      assertEquals(messageId, Push.sendFcm(messaging, target, request));
      return lastMessage();
    }

    /** The message of the last request, as FCM receives it. */
    Map<String, Object> lastMessage() throws Exception {
      MockLowLevelHttpRequest request = requests.get(requests.size() - 1);
      assertEquals("https://fcm.googleapis.com/v1/projects/mock-project/messages:send", request.getUrl());
      Map<String, Object> body = payload(request.getContentAsString());
      assertEquals(List.of("message"), List.copyOf(body.keySet()));
      return Repo.object(body.get("message"));
    }
  }

  @Test
  void sendFcmSendsToATokenOrAFidWithTheRequestsAndroidOptionsThroughTheFirebaseAdminSdk()
      throws Exception {
    MockFcm fcm = new MockFcm();
    FirebaseApp app = FirebaseApp.initializeApp(FirebaseOptions.builder()
        .setCredentials(GoogleCredentials.create(new AccessToken("mock-access-token", null)))
        .setProjectId("mock-project")
        .setHttpTransport(fcm)
        .build(), "PushTest");
    try {
      FirebaseMessaging messaging = FirebaseMessaging.getInstance(app);
      for (Object item : vectors()) {
        Map<String, Object> vector = Repo.object(item);
        Object expected = expected(vector, "fcm");
        if (expected == null) {
          continue;
        }
        String id = (String) vector.get("id");
        FcmRequest request = PushPayloads.fcm(received(Repo.object(vector.get("event"))), options(vector));

        // FCM's REST form. The Firebase Admin SDK writes the priority in lowercase.
        Map<String, Object> message = new LinkedHashMap<>(Repo.object(Repo.object(expected).get("message")));
        Map<String, Object> android = new LinkedHashMap<>(Repo.object(message.get("android")));
        android.put("priority", ((String) android.get("priority")).toLowerCase(Locale.ROOT));
        message.put("android", android);

        Map<String, Object> toToken = new LinkedHashMap<>(message);
        toToken.put("token", "android-token");
        assertEquals(toToken, fcm.send(messaging, ANDROID_TOKEN, request), id);
        Map<String, Object> toFid = new LinkedHashMap<>(message);
        toFid.put("fid", "android-fid");
        assertEquals(toFid, fcm.send(messaging, ANDROID_FID, request), id);
      }
      assertTrue(fcm.requests.size() > 2);

      // Why: setTtl takes milliseconds, so a ring's 45 seconds as is would expire after 45 ms.
      messaging.send(Message.builder()
          .setFid("android-fid")
          .setAndroidConfig(AndroidConfig.builder().setTtl(45).build())
          .build());
      assertEquals("0.045000000s", Repo.object(fcm.lastMessage().get("android")).get("ttl"));
    } finally {
      app.delete();
    }
  }

  private static Map<String, Object> payload(String json) {
    return Repo.object(Json.parse(json));
  }
}
