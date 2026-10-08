package com.convohop.server.push;

import static com.convohop.server.testing.Fixtures.map;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.convohop.server.internal.Json;
import com.convohop.server.testing.Repo;
import com.convohop.server.webhooks.WebhookHeaders;
import com.convohop.server.webhooks.WebhookNotificationEvent;
import com.convohop.server.webhooks.WebhookVerifier;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.Test;

// Expected requests are written out from spec/push-payload/README.md, independently of the builders and the vectors.
class PushPayloadsTest {
  private static final String BUNDLE = "com.example.chat";
  private static final long NOW_SECONDS = 1_791_633_600L;
  private static final Instant NOW = Instant.ofEpochSecond(NOW_SECONDS);
  private static final long DAY = 86_400;
  private static final long CAP = 2_419_200;

  private static final String EVENT_ID = "5b0c1d2e-3f40-4152-8637-48596a7b8c9d";
  private static final String PROJECT_ID = "7e8f9a0b-1c2d-4e3f-9051-627384950a1b";
  private static final String RECIPIENT_ID = "9a8b7c6d-5e4f-4031-a2b3-c4d5e6f70819";
  private static final String CONVERSATION_ID = "2c3d4e5f-6071-4829-b3a4-b5c6d7e8f901";
  private static final String SENDER_ID = "3d4e5f60-7182-4930-84a5-b6c7d8e9f012";
  private static final String MESSAGE_ID = "4e5f6071-8293-4a41-95b6-c7d8e9f01223";
  private static final String LIVE_SESSION_ID = "5f607182-93a4-4b52-a6c7-d8e9f0122334";
  private static final String ALERT_ID = "60718293-a4b5-4c63-b7d8-e9f012233445";
  private static final String COLLAPSE = "60718293a4b54c63b7d8e9f012233445";

  private static final Map<String, Object> METADATA = map("eventId", EVENT_ID, "occurredAt", at(-60),
      "projectId", PROJECT_ID, "recipientId", RECIPIENT_ID, "conversationId", CONVERSATION_ID, "senderId", SENDER_ID);
  private static final Map<String, Object> MESSAGE_DATA =
      with(METADATA, "eventType", "notification.message", "messageId", MESSAGE_ID);
  private static final Map<String, Object> CALL_DATA = with(METADATA, "eventType", "notification.call",
      "occurredAt", at(-5), "liveSessionId", LIVE_SESSION_ID, "alertId", ALERT_ID, "expiresAt", at(40),
      "mediaProfile", "AUDIO_VIDEO");

  /** The builders, by their names in the contract, with their payload limits in bytes. */
  enum Target {
    APNS_ALERT("apnsAlert", 4096),
    APNS_VOIP("apnsVoip", 5120),
    FCM("fcm", 4096),
    WEB_PUSH("webPush", 3993);

    final String key;
    final int limit;

    Target(String key, int limit) {
      this.key = key;
      this.limit = limit;
    }
  }

  /**
   * A built request in the contract's JSON shape, with payloads parsed, plus the exact JSON of the part its
   * platform's limit applies to.
   */
  static final class Built {
    final Target target;
    final Map<String, Object> request;
    final String measured;

    Built(Target target, Map<String, Object> request, String measured) {
      this.target = target;
      this.request = request;
      this.measured = measured;
    }

    int size() {
      return Json.utf8Length(measured);
    }

    Map<String, Object> payload() {
      return Repo.object(request.get("payload"));
    }

    Map<String, Object> headers() {
      return Repo.object(request.get("headers"));
    }

    Map<String, Object> android() {
      return Repo.object(Repo.object(request.get("message")).get("android"));
    }

    /** FCM's {@code data.convohop}, checked to be compact JSON. */
    Map<String, Object> fcmData() {
      String raw = (String) Repo.object(Repo.object(request.get("message")).get("data")).get("convohop");
      assertEquals(raw, Json.stringify(Json.parse(raw)));
      return Repo.object(Json.parse(raw));
    }

    /** The {@code convohop} object: FCM's data, or the payload's. */
    Map<String, Object> convohop() {
      return target == Target.FCM ? fcmData() : Repo.object(payload().get("convohop"));
    }

    /** The visible title and body: the APNs alert's, or the ones in {@code convohop}. */
    List<@Nullable Object> visible() {
      Map<String, Object> source = target == Target.APNS_ALERT
          ? Repo.object(Repo.object(payload().get("aps")).get("alert"))
          : convohop();
      return Arrays.asList(source.get("title"), source.get("body"));
    }

    /** The part the platform's limit applies to, with its visible text replaced. */
    Object measured(Map<String, Object> text) {
      if (target == Target.FCM) {
        return map("convohop", Json.stringify(with(fcmData(), text)));
      }
      if (target == Target.APNS_ALERT) {
        Map<String, Object> aps = Repo.object(payload().get("aps"));
        return with(payload(), "aps", with(aps, "alert", with(Repo.object(aps.get("alert")), text)));
      }
      return map("convohop", with(convohop(), text));
    }
  }

  @Test
  void theSharedVectorsBuildTheSameRequests() {
    Map<String, Object> file = Repo.object(Repo.json("spec/push-payload/vectors.json"));
    List<Object> vectors = Repo.list(file.get("vectors"));
    assertFalse(vectors.isEmpty());
    for (Object item : vectors) {
      Map<String, Object> vector = Repo.object(item);
      String id = (String) vector.get("id");
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
      String bundleId = (String) settings.get("bundleId");
      Map<String, Object> event = Repo.object(vector.get("event"));
      Map<String, Object> expected = Repo.object(vector.get("expected"));
      for (Target target : Target.values()) {
        String label = id + " " + target.key;
        Built built = build(target, parse(event), bundleId, options.build());
        Object result = expected.get(target.key);
        if (result == null) {
          assertNull(built, label);
        } else {
          assertNotNull(built, label);
          Map<String, Object> request = Repo.object(Repo.object(result).get("request"));
          if (target == Target.FCM) {
            Map<String, Object> message = Repo.object(request.get("message"));
            Map<String, Object> data = Repo.object(message.get("data"));
            assertEquals(Repo.object(Json.parse((String) data.get("convohop"))), built.fcmData(), label);
            assertEquals(message.get("android"), built.android(), label);
            assertEquals(Json.stringify(data), built.measured, label);
          } else {
            assertEquals(request.get("headers"), built.headers(), label);
            assertEquals(Json.stringify(request.get("payload")), built.measured, label);
          }
          assertEquals(Repo.object(result).get("bytes"), (long) built.size(), label);
        }
        if (vector.containsKey("unknownFields")) {
          Map<String, Object> extended = with(event, Repo.object(vector.get("unknownFields")));
          Built again = build(target, parse(extended), bundleId, options.build());
          assertEquals(built == null ? null : built.request, again == null ? null : again.request, label);
        }
      }
    }
  }

  @Test
  void theSharedInvalidEventsAreNotNotificationEvents() {
    Map<String, Object> file = Repo.object(Repo.json("spec/push-payload/vectors.json"));
    List<Object> invalid = Repo.list(file.get("invalidEvents"));
    assertFalse(invalid.isEmpty());
    for (Object item : invalid) {
      Map<String, Object> vector = Repo.object(item);
      String json = Json.stringify(vector.get("event"));
      assertThrows(IllegalArgumentException.class, () -> WebhookNotificationEvent.parse(json), (String) vector.get("id"));
    }
  }

  @Test
  void aMessageBuildsAnAlertAnFcmDataMessageAndAWebPushMessageMetadataOnlyByDefault() {
    Map<String, Object> event = messageEvent();
    long ttl = DAY - 60;
    assertEquals(map("headers", map("apns-push-type", "alert", "apns-topic", BUNDLE, "apns-priority", "10",
            "apns-expiration", String.valueOf(NOW_SECONDS + ttl)),
        "payload", map("aps", map("alert", map("loc-key", "CONVOHOP_MESSAGE"), "sound", "default",
            "mutable-content", 1L, "thread-id", CONVERSATION_ID), "convohop", MESSAGE_DATA)),
        build(Target.APNS_ALERT, event).request);
    assertNull(build(Target.APNS_VOIP, event));
    Built fcm = build(Target.FCM, event);
    String raw = (String) Repo.object(Repo.object(fcm.request.get("message")).get("data")).get("convohop");
    assertEquals(map("message", map("data", map("convohop", raw), "android", map("priority", "HIGH", "ttl", ttl + "s"))),
        fcm.request);
    assertEquals(MESSAGE_DATA, fcm.fcmData());
    assertEquals(map("headers", map("TTL", String.valueOf(ttl), "Urgency", "normal"),
        "payload", map("convohop", MESSAGE_DATA)), build(Target.WEB_PUSH, event).request);
  }

  @Test
  void anOptedInPreviewBecomesTheBodyAndTitleAndBodyOptionsAddVisibleText() {
    Map<String, Object> event = messageEvent("preview", map("text", "See you at 6", "truncated", true));
    Map<String, Object> aps = map("sound", "default", "mutable-content", 1L, "thread-id", CONVERSATION_ID);
    Function<PushOptions.Builder, Map<String, Object>> alert =
        options -> build(Target.APNS_ALERT, event, options).payload();
    assertEquals(map("aps", with(map("alert", map("title", "Ada", "body", "See you at 6…")), aps),
        "convohop", MESSAGE_DATA), alert.apply(options().title("Ada")));
    assertEquals(map("aps", with(map("alert", map("body", "See you at 6…")), aps), "convohop", MESSAGE_DATA),
        alert.apply(options().title("").body("")));
    assertEquals(map("aps", with(map("alert", map("body", "New message")), aps), "convohop", MESSAGE_DATA),
        alert.apply(options().body("New message")));
    assertEquals(map("aps", with(map("alert", map("title", "Ada", "loc-key", "CONVOHOP_MESSAGE")), aps),
        "convohop", MESSAGE_DATA), alert.apply(options().title("Ada").preview(false)));
    assertEquals(Arrays.asList(null, "Done"),
        build(Target.APNS_ALERT, messageEvent("preview", map("text", "Done", "truncated", false))).visible());
    assertEquals(with(MESSAGE_DATA, "title", "Ada", "body", "See you at 6…"),
        build(Target.FCM, event, options().title("Ada")).fcmData());
    assertEquals(with(MESSAGE_DATA, "body", "New message"),
        build(Target.WEB_PUSH, event, options().body("New message")).convohop());
    for (Target target : List.of(Target.APNS_ALERT, Target.FCM, Target.WEB_PUSH)) {
      Built request = build(target, event, options().preview(false));
      assertEquals(Arrays.asList(null, null), request.visible(), target.key);
      assertFalse(Json.stringify(request.request).contains("See you"), target.key);
    }
  }

  @Test
  void anIncomingCallBuildsAVoipPushAnAlertAndHighPriorityDataMessagesThatCollapseOnTheRing() {
    Map<String, Object> event = callEvent();
    String expiration = String.valueOf(NOW_SECONDS + 40);
    assertEquals(map("headers", map("apns-push-type", "alert", "apns-topic", BUNDLE, "apns-priority", "10",
            "apns-expiration", expiration, "apns-collapse-id", COLLAPSE),
        "payload", map("aps", map("alert", map("title", "Ada", "loc-key", "CONVOHOP_CALL"), "sound", "default",
            "mutable-content", 1L, "thread-id", CONVERSATION_ID), "convohop", CALL_DATA)),
        build(Target.APNS_ALERT, event, options().title("Ada")).request);
    assertEquals(map("headers", map("apns-push-type", "voip", "apns-topic", BUNDLE + ".voip", "apns-priority", "10",
            "apns-expiration", expiration),
        "payload", map("convohop", with(CALL_DATA, "title", "Ada"))),
        build(Target.APNS_VOIP, event, options().title("Ada")).request);
    Built fcm = build(Target.FCM, event, options().title("Ada"));
    assertEquals(map("priority", "HIGH", "ttl", "40s", "collapse_key", COLLAPSE), fcm.android());
    assertEquals(with(CALL_DATA, "title", "Ada"), fcm.fcmData());
    assertEquals(map("headers", map("TTL", "40", "Urgency", "high", "Topic", COLLAPSE),
        "payload", map("convohop", with(CALL_DATA, "title", "Ada"))),
        build(Target.WEB_PUSH, event, options().title("Ada")).request);
    Map<String, Object> audio = callEvent("mediaProfile", "AUDIO_ONLY", "connected", true);
    assertEquals(with(CALL_DATA, "mediaProfile", "AUDIO_ONLY"), build(Target.APNS_VOIP, audio).convohop());
  }

  @Test
  void aMissedCallReplacesTheRingsAlertAndOtherCancellationsReachOnlyTheDataChannels() {
    for (String reason : List.of("ended", "expired")) {
      Map<String, Object> event = cancelEvent(reason, "occurredAt", at(-15));
      long ttl = DAY - 15;
      Map<String, Object> data =
          with(CALL_DATA, "eventType", "notification.callCancelled", "occurredAt", at(-15), "reason", reason);
      assertEquals(map("headers", map("apns-push-type", "alert", "apns-topic", BUNDLE, "apns-priority", "10",
              "apns-expiration", String.valueOf(NOW_SECONDS + ttl), "apns-collapse-id", COLLAPSE),
          "payload", map("aps", map("alert", map("loc-key", "CONVOHOP_MISSED_CALL"), "sound", "default",
              "mutable-content", 1L, "thread-id", CONVERSATION_ID), "convohop", data)),
          build(Target.APNS_ALERT, event).request, reason);
      assertNull(build(Target.APNS_VOIP, event), reason);
      Built fcm = build(Target.FCM, event);
      assertEquals(map("priority", "HIGH", "ttl", ttl + "s", "collapse_key", COLLAPSE), fcm.android(), reason);
      assertEquals(data, fcm.fcmData(), reason);
      assertEquals(map("headers", map("TTL", String.valueOf(ttl), "Urgency", "high", "Topic", COLLAPSE),
          "payload", map("convohop", data)), build(Target.WEB_PUSH, event).request, reason);
    }
    // Answered, declined and later reasons only stop the ringing, so they live until the ring's deadline.
    for (String reason : List.of("answered", "declined", "transferred")) {
      Map<String, Object> event = cancelEvent(reason, "occurredAt", at(-2));
      Map<String, Object> data =
          with(CALL_DATA, "eventType", "notification.callCancelled", "occurredAt", at(-2), "reason", reason);
      assertNull(build(Target.APNS_ALERT, event), reason);
      assertNull(build(Target.APNS_VOIP, event), reason);
      Built fcm = build(Target.FCM, event);
      assertEquals(map("priority", "HIGH", "ttl", "40s", "collapse_key", COLLAPSE), fcm.android(), reason);
      assertEquals(data, fcm.fcmData(), reason);
      assertEquals(map("headers", map("TTL", "40", "Urgency", "high", "Topic", COLLAPSE),
          "payload", map("convohop", data)), build(Target.WEB_PUSH, event).request, reason);
    }
  }

  @Test
  void lifetimesCountWholeSecondsStopAt28DaysAndYieldNoRequestOnceStale() {
    assertEquals(1L, ttl(messageEvent("occurredAt", at(-DAY + 1))));
    assertNull(ttl(messageEvent("occurredAt", at(-DAY))));
    assertNull(ttl(messageEvent("occurredAt", at(-DAY - 1))));
    // Fractions of the event times and of the clock are dropped.
    assertEquals(DAY - 60, ttl(messageEvent("occurredAt", "2026-10-10T11:59:00.999999999Z")));
    assertEquals(DAY - 60, ttl(messageEvent(), NOW.plusMillis(999)));
    assertEquals(DAY - 61, ttl(messageEvent(), NOW.plusMillis(1000)));
    assertEquals(DAY - 60, ttl(messageEvent("occurredAt", "2026-10-10T13:59:00+02:00")));
    assertEquals(DAY - 60, ttl(messageEvent("occurredAt", "2026-10-10T06:29:00-05:30")));
    assertEquals(1L, ttl(callEvent("expiresAt", at(1))));
    assertNull(ttl(callEvent("expiresAt", at(0))));
    assertNull(ttl(callEvent("expiresAt", at(0).replace("Z", ".999Z"))));
    assertNull(ttl(cancelEvent("answered", "expiresAt", at(-1))));
    assertNull(ttl(cancelEvent("expired", "occurredAt", at(-DAY))));
    // A far deadline, or a producer clock ahead of yours, is capped.
    assertEquals(CAP, ttl(callEvent("expiresAt", at(40 * DAY))));
    assertEquals(CAP - 1, ttl(callEvent("expiresAt", at(CAP - 1))));
    assertEquals(CAP, ttl(messageEvent("occurredAt", at(30 * DAY))));
    assertEquals(String.valueOf(NOW_SECONDS + CAP),
        build(Target.APNS_VOIP, callEvent("expiresAt", at(40 * DAY))).headers().get("apns-expiration"));
    // The default clock is the current time.
    WebPushRequest fresh = PushPayloads.webPush(parse(messageEvent("occurredAt", Instant.now().toString())));
    assertNotNull(fresh);
    assertTrue(fresh.getTtlSeconds() >= DAY - 2 && fresh.getTtlSeconds() <= DAY, String.valueOf(fresh.getTtlSeconds()));
    ApnsRequest alert = PushPayloads.apnsAlert(parse(messageEvent("occurredAt", Instant.now().toString())), BUNDLE);
    assertNotNull(alert);
    long left = alert.getExpiration() - Instant.now().getEpochSecond();
    assertTrue(left >= DAY - 2 && left <= DAY, String.valueOf(left));
    assertNotNull(PushPayloads.apnsVoip(parse(callEvent("expiresAt", Instant.now().plusSeconds(30).toString())), BUNDLE));
    assertNotNull(PushPayloads.fcm(parse(messageEvent("occurredAt", Instant.now().toString()))));
  }

  @Test
  void aRequestExactlyAtItsLimitIsKeptAndOneByteOverShortensTheBody() {
    for (Target target : Target.values()) {
      Map<String, Object> event = target == Target.APNS_VOIP ? callEvent() : messageEvent();
      int limit = target.limit;
      Function<String, Built> request = body -> build(target, event, options().title("Ada").body(body));
      int pad = limit - size(request.apply("x").measured(map())) + 1;
      String body = "x".repeat(pad);
      Built exact = request.apply(body);
      assertEquals(limit, exact.size(), target.key);
      assertEquals(Arrays.asList("Ada", body), exact.visible(), target.key);
      Built over = request.apply(body + "y");
      assertEquals(limit, over.size(), target.key);
      assertEquals(Arrays.asList("Ada", "x".repeat(pad - 3) + "…"), over.visible(), target.key);
      // A preview that doesn't fit beside a long title is shortened like a body.
      if (target != Target.APNS_VOIP) {
        String title = "T".repeat(700);
        Built previewed = build(target,
            messageEvent("preview", map("text", "\u0001".repeat(512), "truncated", false)), options().title(title));
        List<@Nullable Object> shown = previewed.visible();
        assertEquals(title, shown.get(0), target.key);
        String text = (String) shown.get(1);
        assertTrue(text.matches("\u0001{1,511}…"), target.key);
        assertTrue(previewed.size() <= limit, target.key);
        assertTrue(size(previewed.measured(map("body", "\u0001" + text))) > limit, target.key + " preview is not maximal");
      }
    }
  }

  @Test
  void shortenedTextKeepsWholeCodePointsAndTheLongestPrefixThatFits() {
    for (Target target : Target.values()) {
      Map<String, Object> event = target == Target.APNS_VOIP ? callEvent() : messageEvent();
      int limit = target.limit;
      for (String unit : List.of("é", "€", "👋", "\u0001", "\"", "\\", "\n", "a👋")) {
        String label = target.key + " " + Json.stringify(unit);
        String full = unit.repeat(limit);
        Built request = build(target, event, options().body(full));
        String body = (String) request.visible().get(1);
        String prefix = body.substring(0, body.length() - 1);
        assertTrue(body.endsWith("…") && full.startsWith(prefix), label);
        assertFalse(Json.hasLoneSurrogate(body), label);
        assertTrue(request.size() <= limit, label);
        String longer = full.substring(0, full.offsetByCodePoints(0, prefix.codePointCount(0, prefix.length()) + 1));
        assertTrue(size(request.measured(map("body", longer + "…"))) > limit, label + " is not maximal");
      }
    }
  }

  @Test
  void aTitleTooLongForAnyPayloadShortensTheBodyToAnEllipsisAndThenTheTitle() {
    for (Target target : Target.values()) {
      Map<String, Object> event = target == Target.APNS_VOIP ? callEvent() : messageEvent();
      String title = "T".repeat(6000);
      for (String body : Arrays.asList("hello", null)) {
        Built request = build(target, event, options().title(title).body(body));
        List<@Nullable Object> text = request.visible();
        assertEquals(body == null ? null : "…", text.get(1), target.key);
        assertTrue(((String) text.get(0)).matches("T+…"), target.key);
        assertTrue(request.size() <= target.limit, target.key);
        assertTrue(size(request.measured(map("title", "T" + text.get(0)))) > target.limit,
            target.key + " title is not maximal");
      }
      if (target == Target.APNS_ALERT) {
        Map<String, Object> alert = Repo.object(
            Repo.object(build(target, event, options().title(title)).payload().get("aps")).get("alert"));
        assertEquals("CONVOHOP_MESSAGE", alert.get("loc-key"));
      }
    }
  }

  @Test
  void invalidOptionsAndBundleIdsAreRejected() {
    for (String text : List.of("\uD800", "end\uDBFF", "\uDC00start")) {
      IllegalArgumentException title =
          assertThrows(IllegalArgumentException.class, () -> PushOptions.builder().title(text));
      assertEquals("title must be a string without lone surrogates", title.getMessage());
      assertThrows(IllegalArgumentException.class, () -> PushOptions.builder().body(text));
    }
    assertThrows(NullPointerException.class, () -> PushOptions.builder().clock(null));
    WebhookNotificationEvent message = parse(messageEvent());
    WebhookNotificationEvent call = parse(callEvent());
    PushOptions options = options().build();
    for (Target target : Target.values()) {
      WebhookNotificationEvent event = target == Target.APNS_VOIP ? call : message;
      assertThrows(NullPointerException.class, () -> build(target, null, BUNDLE, options), target.key);
      assertThrows(NullPointerException.class, () -> build(target, event, BUNDLE, null), target.key);
    }
    for (Target target : List.of(Target.APNS_ALERT, Target.APNS_VOIP)) {
      WebhookNotificationEvent event = target == Target.APNS_VOIP ? call : message;
      for (String bundleId : List.of("", "com..example", ".com.example", "com.example.", "com example", "com/example",
          "com_example", "com.exämple", "a".repeat(156))) {
        assertThrows(IllegalArgumentException.class, () -> build(target, event, bundleId, options), bundleId);
      }
      assertThrows(NullPointerException.class, () -> build(target, event, null, options), target.key);
      for (String bundleId : List.of("a".repeat(155), "com.example-app.Chat2", "A", "1.2")) {
        Built built = build(target, event, bundleId, options);
        assertNotNull(built, bundleId);
        assertEquals(target == Target.APNS_VOIP ? bundleId + ".voip" : bundleId, built.headers().get("apns-topic"));
      }
    }
  }

  @Test
  void eventsOutsideThePushPayloadContractAreRejectedWithoutEchoingValues() {
    String marker = "value-marker-4f2a";
    List<String> invalid = new ArrayList<>(List.of("null", "\"event\"", "[]", "{}"));
    for (Map<String, Object> event : List.of(
        with(messageEvent(), "eventType", "message.created", "subjectRef", map("id", MESSAGE_ID, "kind", "message")),
        messageEvent("preview", map("text", "a\uD800", "truncated", false)),
        messageEvent("preview", map("text", "x".repeat(513), "truncated", false)),
        messageEvent("subjectRef", map("id", LIVE_SESSION_ID, "kind", "message")),
        callEvent("alertId", ALERT_ID.toUpperCase(java.util.Locale.ROOT)),
        callEvent("expiresAt", "2026-02-29T00:00:00Z"),
        without(cancelEvent("answered"), "reason"),
        cancelEvent("answered", "reason", "not a reason"),
        messageEvent("senderId", marker),
        callEvent("mediaProfile", marker + "!"))) {
      invalid.add(Json.stringify(event));
    }
    for (String json : invalid) {
      IllegalArgumentException error =
          assertThrows(IllegalArgumentException.class, () -> WebhookNotificationEvent.parse(json), json);
      assertFalse(error.getMessage().contains(marker), error.getMessage());
    }
    IllegalArgumentException title =
        assertThrows(IllegalArgumentException.class, () -> PushOptions.builder().title(marker + "\uD800"));
    assertFalse(title.getMessage().contains(marker), title.getMessage());
  }

  @Test
  void buildersTakeVerifiedWebhookEventsAndIgnoreUnknownFieldsAndConnected() throws GeneralSecurityException {
    byte[] key = new byte[32];
    new SecureRandom().nextBytes(key);
    String secret = "whsec_" + Base64.getEncoder().encodeToString(key);
    WebhookVerifier verifier = WebhookVerifier.builder().secrets(secret).clock(clock(NOW)).build();
    String webhookId = "msg_push_pipeline";
    String timestamp = String.valueOf(NOW_SECONDS);
    for (Map<String, Object> event : List.of(messageEvent("preview", map("text", "Grüße 👋", "truncated", false)),
        callEvent(), cancelEvent("expired"), cancelEvent("declined"))) {
      String body = Json.stringify(with(event, "addedLater", true));
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(key, "HmacSHA256"));
      String signature = Base64.getEncoder().encodeToString(
          mac.doFinal((webhookId + "." + timestamp + "." + body).getBytes(StandardCharsets.UTF_8)));
      WebhookNotificationEvent verified = assertInstanceOf(WebhookNotificationEvent.class, verifier.verify(
          WebhookHeaders.of(Map.of("webhook-id", webhookId, "webhook-timestamp", timestamp,
              "webhook-signature", "v1," + signature)), body).getEvent());
      WebhookNotificationEvent flipped = parse(with(event, "connected", !((Boolean) event.get("connected")),
          "addedLater", map("a", 1L)));
      PushOptions options = options().title("Ada").build();
      for (Target target : Target.values()) {
        Built expected = build(target, parse(event), BUNDLE, options);
        Map<String, Object> shape = expected == null ? null : expected.request;
        Built fromVerified = build(target, verified, BUNDLE, options);
        Built fromFlipped = build(target, flipped, BUNDLE, options);
        Built again = build(target, parse(event), BUNDLE, options);
        assertEquals(shape, fromVerified == null ? null : fromVerified.request, target.key);
        assertEquals(shape, fromFlipped == null ? null : fromFlipped.request, target.key);
        assertEquals(shape, again == null ? null : again.request, target.key + " is not deterministic");
      }
    }
  }

  @Test
  void requestsAndOptionsKeepVisibleTextOutOfTheirStrings() {
    String marker = "text-marker-91c3";
    WebhookNotificationEvent event = parse(messageEvent("preview", map("text", marker, "truncated", false)));
    PushOptions options = options().title(marker).body(marker).build();
    assertFalse(options.toString().contains(marker), options.toString());
    ApnsRequest alert = PushPayloads.apnsAlert(event, BUNDLE, options);
    FcmRequest fcm = PushPayloads.fcm(event, options);
    WebPushRequest webPush = PushPayloads.webPush(event, options);
    for (Object request : Arrays.asList(alert, fcm, webPush)) {
      assertNotNull(request);
      assertFalse(request.toString().contains(marker), request.toString());
    }
    assertNotNull(alert);
    assertTrue(alert.getPayload().contains(marker));
    assertEquals(PushOptions.defaults().toString(), PushOptions.builder().build().toString());
    assertTrue(PushOptions.defaults().isPreview());
    assertNull(PushOptions.defaults().getTitle());
    assertNull(options().title("").build().getTitle());
  }

  /** Every builder's lifetime for the event, or null when none returns a request. */
  private static @Nullable Long ttl(Map<String, Object> event) {
    return ttl(event, NOW);
  }

  private static @Nullable Long ttl(Map<String, Object> event, Instant now) {
    long clock = now.getEpochSecond();
    HashSet<String> ttls = new HashSet<>();
    for (Target target : Target.values()) {
      Built built = build(target, event, options().clock(clock(now)));
      if (built == null) {
        continue;
      }
      if (target == Target.FCM) {
        String ttl = (String) built.android().get("ttl");
        ttls.add(ttl.substring(0, ttl.length() - 1));
      } else if (target == Target.WEB_PUSH) {
        ttls.add((String) built.headers().get("TTL"));
      } else {
        ttls.add(String.valueOf(Long.parseLong((String) built.headers().get("apns-expiration")) - clock));
      }
    }
    assertTrue(ttls.size() <= 1, ttls.toString());
    return ttls.isEmpty() ? null : Long.valueOf(ttls.iterator().next());
  }

  private static PushOptions.Builder options() {
    return PushOptions.builder().clock(clock(NOW));
  }

  private static Clock clock(Instant now) {
    return Clock.fixed(now, ZoneOffset.UTC);
  }

  private static @Nullable Built build(Target target, Map<String, Object> event) {
    return build(target, event, options());
  }

  private static @Nullable Built build(Target target, Map<String, Object> event, PushOptions.Builder options) {
    return build(target, parse(event), BUNDLE, options.build());
  }

  /** Runs a builder and checks that its request's accessors agree with its headers and JSON. */
  private static @Nullable Built build(
      Target target, WebhookNotificationEvent event, String bundleId, PushOptions options) {
    switch (target) {
      case APNS_ALERT:
        return apns(target, PushPayloads.apnsAlert(event, bundleId, options));
      case APNS_VOIP:
        return apns(target, PushPayloads.apnsVoip(event, bundleId, options));
      case FCM: {
        FcmRequest request = PushPayloads.fcm(event, options);
        if (request == null) {
          return null;
        }
        Map<String, Object> message = Repo.object(Json.parse(request.getMessage()));
        assertEquals(List.of("data", "android"), new ArrayList<>(message.keySet()));
        assertEquals(request.getData(), message.get("data"));
        assertEquals(List.of("convohop"), new ArrayList<>(request.getData().keySet()));
        Map<String, Object> android = Repo.object(message.get("android"));
        assertEquals(request.getPriority(), android.get("priority"));
        assertEquals(request.getTtlSeconds() + "s", android.get("ttl"));
        assertEquals(request.getCollapseKey(), android.get("collapse_key"));
        return new Built(target, map("message", message), Json.stringify(request.getData()));
      }
      default: {
        WebPushRequest request = PushPayloads.webPush(event, options);
        if (request == null) {
          return null;
        }
        Map<String, String> headers = request.getHeaders();
        assertEquals(String.valueOf(request.getTtlSeconds()), headers.get("TTL"));
        assertEquals(request.getUrgency(), headers.get("Urgency"));
        assertEquals(request.getTopic(), headers.get("Topic"));
        return new Built(target, map("headers", headers, "payload", Json.parse(request.getPayload())),
            request.getPayload());
      }
    }
  }

  private static @Nullable Built apns(Target target, @Nullable ApnsRequest request) {
    if (request == null) {
      return null;
    }
    Map<String, String> headers = request.getHeaders();
    assertEquals(request.getPushType(), headers.get("apns-push-type"));
    assertEquals(request.getTopic(), headers.get("apns-topic"));
    assertEquals(String.valueOf(request.getPriority()), headers.get("apns-priority"));
    assertEquals(String.valueOf(request.getExpiration()), headers.get("apns-expiration"));
    assertEquals(request.getCollapseId(), headers.get("apns-collapse-id"));
    return new Built(target, map("headers", headers, "payload", Json.parse(request.getPayload())), request.getPayload());
  }

  private static WebhookNotificationEvent parse(Map<String, Object> event) {
    return WebhookNotificationEvent.parse(Json.stringify(event));
  }

  /** The RFC 3339 time {@code offset} seconds after now. */
  private static String at(long offset) {
    return Instant.ofEpochSecond(NOW_SECONDS + offset).toString();
  }

  private static Map<String, Object> common() {
    return map("eventId", EVENT_ID, "projectId", PROJECT_ID, "recipientId", RECIPIENT_ID,
        "conversationId", CONVERSATION_ID, "senderId", SENDER_ID, "connected", false);
  }

  private static Map<String, Object> messageEvent(Object... fields) {
    return with(with(common(), "eventType", "notification.message", "occurredAt", at(-60),
        "subjectRef", map("id", MESSAGE_ID, "kind", "message"), "messageId", MESSAGE_ID), map(fields));
  }

  private static Map<String, Object> callEvent(Object... fields) {
    return with(with(common(), "eventType", "notification.call", "occurredAt", at(-5),
        "subjectRef", map("id", LIVE_SESSION_ID, "kind", "liveSession"), "liveSessionId", LIVE_SESSION_ID,
        "alertId", ALERT_ID, "expiresAt", at(40), "mediaProfile", "AUDIO_VIDEO"), map(fields));
  }

  private static Map<String, Object> cancelEvent(String reason, Object... fields) {
    return with(callEvent("eventType", "notification.callCancelled", "reason", reason), map(fields));
  }

  private static int size(Object value) {
    return Json.utf8Length(Json.stringify(value));
  }

  private static Map<String, Object> with(Map<String, Object> base, Object... entries) {
    return with(base, map(entries));
  }

  private static Map<String, Object> with(Map<String, Object> base, Map<String, Object> entries) {
    Map<String, Object> copy = new LinkedHashMap<>(base);
    copy.putAll(entries);
    return copy;
  }

  private static Map<String, Object> without(Map<String, Object> base, String key) {
    Map<String, Object> copy = new LinkedHashMap<>(base);
    copy.remove(key);
    return copy;
  }
}
