package com.convohop.server.webhooks;

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
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.StringJoiner;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

class WebhookVerifierTest {
  private static final SecureRandom RANDOM = new SecureRandom();
  private static final Instant NOW = Instant.parse("2026-10-10T12:00:00Z");
  private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
  private static final long TIMESTAMP = NOW.getEpochSecond();
  private static final String WEBHOOK_ID = UUID.randomUUID().toString();
  private static final String CURRENT = newSecret(32);
  private static final String NEXT = newSecret(32);
  private static final String REPLACED = newSecret(32);
  /** The event types in the webhook contract (ConvoHop/ConveHop docs/webhooks.md, "Events"). */
  private static final List<String> CONTRACT_EVENT_TYPES = List.of(
      "conversation.created", "conversation.updated",
      "member.added", "member.roleChanged", "member.historyExpanded", "member.removed",
      "member.broadcastPermissionChanged",
      "message.created", "message.edited", "message.deleted", "receipt.reported",
      "live.started", "live.participationChanged", "live.alerted", "live.ready", "live.connected", "live.ended",
      "webhook.endpointDisabled");
  /** Shared conformance codes, mapped to this verifier's reason codes. */
  private static final Map<String, WebhookVerificationCode> SHARED_CODES = Map.of(
      "WEBHOOK_SIGNATURE_INVALID", WebhookVerificationCode.NO_MATCHING_SIGNATURE,
      "WEBHOOK_TIMESTAMP_EXPIRED", WebhookVerificationCode.TIMESTAMP_EXPIRED,
      "WEBHOOK_TIMESTAMP_FUTURE", WebhookVerificationCode.TIMESTAMP_FUTURE,
      "WEBHOOK_TIMESTAMP_INVALID", WebhookVerificationCode.INVALID_TIMESTAMP,
      "WEBHOOK_HEADERS_MISSING", WebhookVerificationCode.MISSING_HEADER);

  @Test
  void theStandardWebhooksVectorVerifiesAndItsBodyIsNotAConvoHopEvent() {
    String secret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
    String id = "msg_p5jXN8AQM9LWM0D4loKWxJek";
    String body = "{\"test\": 2432232314}";
    String signature = "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=";
    assertEquals(signature, sign(secret, id, "1614265330", utf8(body)));
    WebhookHeaders headers = WebhookHeaders.of(
        strings("webhook-id", id, "webhook-timestamp", "1614265330", "webhook-signature", signature));
    WebhookVerifier verifier = WebhookVerifier.builder()
        .secrets(secret)
        .clock(Clock.fixed(Instant.ofEpochSecond(1614265330), ZoneOffset.UTC))
        .build();
    for (WebhookSignature verified : List.of(
        verifier.verifySignature(headers, body), verifier.verifySignature(headers, utf8(body)))) {
      assertEquals(id, verified.getWebhookId());
      assertEquals(1614265330L, verified.getTimestamp());
    }
    rejects(WebhookVerificationCode.INVALID_BODY, () -> verifier.verify(headers, body));
    WebhookVerifier live = WebhookVerifier.builder().secrets(secret).build();
    rejects(WebhookVerificationCode.TIMESTAMP_EXPIRED, () -> live.verifySignature(headers, body));
  }

  @Test
  void theSharedConformanceVectorsGiveTheSameVerdicts() {
    Map<String, Object> shared = Repo.object(Repo.json("spec/conformance/vectors/webhooks.json"));
    assertEquals("standard-webhooks-v1", shared.get("scheme"));
    List<Object> vectors = Repo.list(shared.get("vectors"));
    assertFalse(vectors.isEmpty());
    for (Object item : vectors) {
      Map<String, Object> vector = Repo.object(item);
      String id = (String) vector.get("id");
      Map<String, String> headers = new LinkedHashMap<>();
      for (Map.Entry<String, Object> header : Repo.object(vector.get("headers")).entrySet()) {
        headers.put(header.getKey(), (String) header.getValue());
      }
      List<String> secrets = new ArrayList<>();
      for (Object secret : Repo.list(vector.get("secrets"))) {
        secrets.add((String) secret);
      }
      WebhookVerifier verifier = WebhookVerifier.builder()
          .secrets(secrets)
          .toleranceSeconds((Long) vector.get("toleranceSeconds"))
          .clock(Clock.fixed(Instant.ofEpochSecond((Long) vector.get("nowSeconds")), ZoneOffset.UTC))
          .build();
      String payload = (String) vector.get("payload");
      Map<String, Object> expected = Repo.object(vector.get("expected"));
      if (Boolean.TRUE.equals(expected.get("valid"))) {
        WebhookSignature verified = verifier.verifySignature(WebhookHeaders.of(headers), payload);
        assertEquals(header(headers, "webhook-id"), verified.getWebhookId(), id);
        assertEquals(Long.parseLong(header(headers, "webhook-timestamp")), verified.getTimestamp(), id);
      } else {
        WebhookVerificationCode code = SHARED_CODES.get((String) expected.get("code"));
        assertNotNull(code, id + ": unmapped " + expected.get("code"));
        WebhookVerificationException error = assertThrows(
            WebhookVerificationException.class, () -> verifier.verifySignature(WebhookHeaders.of(headers), payload), id);
        assertEquals(code, error.getCode(), id);
      }
    }
  }

  @Test
  void aVerifiedDeliveryReturnsItsIdTimestampAndMetadataOnlyEvent() {
    Map<String, Object> event = envelope();
    VerifiedWebhook verified = verify(Json.stringify(event));
    assertEquals(WEBHOOK_ID, verified.getWebhookId());
    assertEquals(TIMESTAMP, verified.getTimestamp());
    WebhookResourceEvent resource = assertInstanceOf(WebhookResourceEvent.class, verified.getEvent());
    assertTrue(resource.isKnown());
    assertEnvelope(event, resource);
    for (String eventType : CONTRACT_EVENT_TYPES) {
      String kind = eventType.equals("webhook.endpointDisabled") ? "webhookEndpoint" : eventType.split("\\.")[0];
      WebhookEvent parsed = verify(Json.stringify(envelope(
          "eventType", eventType, "subjectRef", map("id", UUID.randomUUID().toString(), "kind", kind)))).getEvent();
      assertTrue(parsed.isKnown(), eventType);
      assertEquals(eventType, parsed.getEventType());
      assertEquals(kind, parsed.getSubjectRef().getKind());
      Class<? extends WebhookEvent> expected =
          eventType.equals("webhook.endpointDisabled") ? WebhookEndpointDisabledEvent.class : WebhookResourceEvent.class;
      assertEquals(expected, parsed.getClass(), eventType);
    }
  }

  @Test
  void unknownEventTypesAndFieldsPassThroughAndNeverThrow() {
    WebhookEvent unknown = verify(Json.stringify(envelope("eventType", "message.reacted", "extra", map("a", 1L))))
        .getEvent();
    assertInstanceOf(WebhookUnknownEvent.class, unknown);
    assertFalse(unknown.isKnown());
    assertEquals("message.reacted", unknown.getEventType());
    WebhookEvent misfiled = verify(Json.stringify(envelope("eventType", "webhook.endpointDisabled",
        "subjectRef", map("id", UUID.randomUUID().toString(), "kind", "conversation")))).getEvent();
    assertFalse(misfiled.isKnown());
    assertEquals("conversation", misfiled.getSubjectRef().getKind());
  }

  @Test
  void notificationEventsVerifyAsKnownEventsWithOnlyTheirContractFields() {
    List<Map<String, Object>> events = new ArrayList<>(List.of(
        notification("notification.message"),
        notification("notification.message",
            "connected", true, "preview", map("text", "Grüße, 世界 👋", "truncated", true)),
        notification("notification.message", "preview", map("text", "👋".repeat(512), "truncated", false)),
        notification("notification.call"),
        notification("notification.call", "mediaProfile", "AUDIO_ONLY", "connected", true)));
    for (String reason : List.of("answered", "declined", "ended", "expired")) {
      events.add(notification("notification.callCancelled", "reason", reason));
    }
    // Media profiles and cancel reasons are open enumerations.
    events.add(notification("notification.callCancelled", "mediaProfile", "SCREEN_SHARE", "reason", "transferred"));
    events.add(notification("notification.call",
        "occurredAt", "2026-10-10T13:59:59.123456789+02:00", "expiresAt", "2028-02-29T00:00:00Z"));
    for (Map<String, Object> event : events) {
      Map<String, Object> subject = new LinkedHashMap<>(Repo.object(event.get("subjectRef")));
      subject.put("label", "ignored");
      Map<String, Object> sent = with(event, "addedLater", map("nested", List.of(1L)), "subjectRef", subject);
      VerifiedWebhook verified = verify(Json.stringify(sent));
      assertEquals(WEBHOOK_ID, verified.getWebhookId());
      assertNotification(event, verified.getEvent());
    }
  }

  @Test
  void theLargestNotificationEventFitsInAWebhookBody() {
    Map<String, Object> largest = notification("notification.message",
        "occurredAt", "2026-10-10T23:59:59.999999999-23:59", "preview", map("text", "\u0001".repeat(512), "truncated", false));
    String body = Json.stringify(largest);
    assertTrue(utf8(body).length <= 4096, String.valueOf(utf8(body).length));
    assertNotification(largest, verify(body).getEvent());
  }

  @Test
  void notificationEventsThatBreakThePushPayloadContractVerifyAsUnknownEvents() {
    Map<String, Object> message = notification("notification.message");
    Map<String, Object> call = notification("notification.call");
    Map<String, Object> cancelled = notification("notification.callCancelled");
    String messageId = (String) message.get("messageId");
    List<Map<String, Object>> malformed = List.of(
        with(message, "subjectRef", map("id", UUID.randomUUID().toString(), "kind", "message")),
        with(message, "subjectRef", map("id", messageId, "kind", "liveSession")),
        with(call, "subjectRef", map("id", call.get("liveSessionId"), "kind", "message")),
        with(message, "recipientId", ((String) message.get("recipientId")).toUpperCase(Locale.ROOT)),
        with(message, "senderId", "00000000-0000-0000-0000-000000000000"),
        without(message, "conversationId"),
        with(message, "connected", "false"),
        with(message, "preview", null),
        with(message, "preview", map("text", "hi")),
        with(message, "preview", map("text", "", "truncated", false)),
        with(message, "preview", map("text", "x".repeat(513), "truncated", true)),
        with(message, "preview", map("text", "a\uD800", "truncated", false)),
        with(message, "occurredAt", "2026-10-10t12:00:00z"),
        with(message, "occurredAt", "2026-02-29T00:00:00Z"),
        with(message, "occurredAt", "2026-10-10T12:00:00.1234567890Z"),
        with(call, "expiresAt", "2026-10-10T23:59:60Z"),
        with(call, "mediaProfile", "audio-video"),
        with(call, "mediaProfile", "A" + "b".repeat(64)),
        without(call, "alertId"),
        with(cancelled, "reason", ""),
        without(cancelled, "reason"),
        with(call, "eventType", "notification.callCancelled"));
    for (Map<String, Object> event : malformed) {
      WebhookEvent parsed = verify(Json.stringify(event)).getEvent();
      assertInstanceOf(WebhookUnknownEvent.class, parsed, Json.stringify(event));
      assertEnvelope(event, parsed);
      assertThrows(IllegalArgumentException.class, () -> WebhookNotificationEvent.parse(Json.stringify(event)));
    }
    // The envelope rules still apply first.
    for (Map<String, Object> event : List.of(
        with(message, "subjectRef", map("id", messageId)), with(call, "projectId", ""))) {
      rejects(WebhookVerificationCode.INVALID_BODY, () -> verify(Json.stringify(event)));
    }
  }

  @Test
  void theSharedInvalidPushEventsVerifyAsUnknownEvents() {
    Map<String, Object> file = Repo.object(Repo.json("spec/push-payload/vectors.json"));
    List<Object> invalid = Repo.list(file.get("invalidEvents"));
    assertFalse(invalid.isEmpty());
    for (Object item : invalid) {
      Map<String, Object> vector = Repo.object(item);
      Map<String, Object> event = Repo.object(vector.get("event"));
      WebhookEvent parsed = verify(Json.stringify(event)).getEvent();
      assertInstanceOf(WebhookUnknownEvent.class, parsed, (String) vector.get("id"));
      assertEnvelope(event, parsed);
    }
  }

  @Test
  void notificationEventsParseOnTheirOwn() {
    Map<String, Object> event = notification("notification.call");
    assertNotification(event, WebhookNotificationEvent.parse(Json.stringify(event)));
    for (String json : List.of("not json", "[]", "null", Json.stringify(envelope()), Json.stringify(with(
        event, "eventType", "notification.reacted")))) {
      IllegalArgumentException error =
          assertThrows(IllegalArgumentException.class, () -> WebhookNotificationEvent.parse(json), json);
      assertTrue(error.getMessage().startsWith("Invalid notification event"), error.getMessage());
    }
    assertThrows(NullPointerException.class, () -> WebhookNotificationEvent.parse(null));
  }

  @Test
  void tamperingWithTheBodyIdOrTimestampFailsTheSignature() {
    String body = Json.stringify(envelope());
    Map<String, String> signed = headers(utf8(body));
    WebhookVerifier verifier = verifier(CURRENT);
    rejects(WebhookVerificationCode.NO_MATCHING_SIGNATURE,
        () -> verifier.verify(WebhookHeaders.of(signed), body.replace("message.created", "message.deleted")));
    // The same JSON value, serialized differently, is a different body.
    rejects(WebhookVerificationCode.NO_MATCHING_SIGNATURE,
        () -> verifier.verify(WebhookHeaders.of(signed), "{ " + body.substring(1)));
    rejects(WebhookVerificationCode.NO_MATCHING_SIGNATURE, () -> verifier.verify(
        WebhookHeaders.of(with(signed, "webhook-id", UUID.randomUUID().toString())), body));
    rejects(WebhookVerificationCode.NO_MATCHING_SIGNATURE, () -> verifier.verify(
        WebhookHeaders.of(with(signed, "webhook-timestamp", Long.toString(TIMESTAMP + 1))), body));
    // The signed timestamp is the header text, not its numeric value.
    rejects(WebhookVerificationCode.NO_MATCHING_SIGNATURE, () -> verifier.verify(
        WebhookHeaders.of(with(signed, "webhook-timestamp", "0" + TIMESTAMP)), body));
    rejects(WebhookVerificationCode.NO_MATCHING_SIGNATURE,
        () -> verifier(newSecret(32)).verify(WebhookHeaders.of(signed), body));
  }

  @Test
  void timestampsPassWithinTheToleranceInclusiveAndFailOutsideItWithADirection() {
    byte[] body = utf8(Json.stringify(envelope()));
    WebhookVerifier verifier = verifier(CURRENT);
    assertEquals(TIMESTAMP - 300, verifier.verify(at(body, TIMESTAMP - 300), body).getTimestamp());
    assertEquals(TIMESTAMP + 300, verifier.verify(at(body, TIMESTAMP + 300), body).getTimestamp());
    rejects(WebhookVerificationCode.TIMESTAMP_EXPIRED, () -> verifier.verify(at(body, TIMESTAMP - 301), body));
    rejects(WebhookVerificationCode.TIMESTAMP_FUTURE, () -> verifier.verify(at(body, TIMESTAMP + 301), body));
    // The clock is compared in whole seconds.
    WebhookVerifier late = WebhookVerifier.builder()
        .secrets(CURRENT).clock(Clock.fixed(NOW.plusMillis(999), ZoneOffset.UTC)).build();
    assertNotNull(late.verify(at(body, TIMESTAMP - 300), body));
    WebhookVerifier strict = WebhookVerifier.builder().secrets(CURRENT).clock(CLOCK).toleranceSeconds(0).build();
    assertNotNull(strict.verify(at(body, TIMESTAMP), body));
    rejects(WebhookVerificationCode.TIMESTAMP_EXPIRED, () -> strict.verify(at(body, TIMESTAMP - 1), body));
    WebhookVerifier lenient = WebhookVerifier.builder().secrets(CURRENT).clock(CLOCK).toleranceSeconds(3600).build();
    assertNotNull(lenient.verify(at(body, TIMESTAMP + 3600), body));
    long fresh = Instant.now().getEpochSecond();
    assertEquals(fresh, WebhookVerifier.builder().secrets(CURRENT).build().verify(at(body, fresh), body).getTimestamp());
    // Timestamps are checked before signatures.
    rejects(WebhookVerificationCode.TIMESTAMP_EXPIRED,
        () -> verifier(newSecret(32)).verify(at(body, TIMESTAMP - 301), body));
    Map<String, String> signed = headers(body);
    for (String stamp : List.of("-1", "1.5", "1e9", " 1", "0x10", "1234567890123456", "１２３")) {
      rejects(WebhookVerificationCode.INVALID_TIMESTAMP,
          () -> verifier.verify(WebhookHeaders.of(with(signed, "webhook-timestamp", stamp)), body));
    }
  }

  @Test
  void duringARotationAnyHeldSecretVerifiesWhateverOrderTheEntriesArriveIn() {
    byte[] body = utf8(Json.stringify(envelope()));
    // The sender signs with the current secret, then the next one (at most 5 minutes) or the replaced one (24 hours).
    for (List<String> signers : List.of(
        List.of(CURRENT, NEXT), List.of(CURRENT, REPLACED), List.of(CURRENT, NEXT, REPLACED))) {
      WebhookHeaders headers = WebhookHeaders.of(headers(body, signers, WEBHOOK_ID, TIMESTAMP));
      for (String held : signers) {
        assertEquals(WEBHOOK_ID, verifier(held).verify(headers, body).getWebhookId());
      }
      assertNotNull(verifier(newSecret(32), signers.get(signers.size() - 1)).verify(headers, body));
      rejects(WebhookVerificationCode.NO_MATCHING_SIGNATURE,
          () -> verifier(newSecret(32), newSecret(32)).verify(headers, body));
    }
  }

  @Test
  void otherSchemesAndMalformedEntriesAreIgnoredAndMoreThanEightEntriesAreRejected() {
    byte[] body = utf8(Json.stringify(envelope()));
    Map<String, String> signed = headers(body);
    String valid = signed.get("webhook-signature");
    String mac = valid.substring("v1,".length());
    String shortMac = Base64.getEncoder().encodeToString(new byte[16]);
    List<String> ignored = List.of("v2," + mac, "V1," + mac, "v1a," + mac, "," + mac, mac, "v1", "v1,",
        "v1,not*base64", "v1," + mac.substring(0, mac.length() - 1), "v1," + mac + "x", "v1," + shortMac);
    WebhookVerifier verifier = verifier(CURRENT);
    for (String entry : ignored) {
      rejects(WebhookVerificationCode.NO_MATCHING_SIGNATURE,
          () -> verifier.verify(WebhookHeaders.of(with(signed, "webhook-signature", entry)), body));
    }
    List<String> seven = new ArrayList<>(ignored.subList(0, 7));
    seven.add(valid);
    assertNotNull(verifier.verify(WebhookHeaders.of(with(signed, "webhook-signature", String.join(" ", seven))), body));
    assertNotNull(verifier.verify(
        WebhookHeaders.of(with(signed, "webhook-signature", "  " + valid + "  " + ignored.get(0) + " ")), body));
    List<String> eight = new ArrayList<>(ignored.subList(0, 8));
    eight.add(valid);
    rejects(WebhookVerificationCode.TOO_MANY_SIGNATURES,
        () -> verifier.verify(WebhookHeaders.of(with(signed, "webhook-signature", String.join(" ", eight))), body));
    rejects(WebhookVerificationCode.TOO_MANY_SIGNATURES, () -> verifier.verify(
        WebhookHeaders.of(with(signed, "webhook-signature", String.join(" ", Collections.nCopies(9, valid)))), body));
  }

  @Test
  void headerNamesMatchCaseInsensitivelyAndMissingEmptyOrRepeatedHeadersAreRejected() {
    byte[] body = utf8(Json.stringify(envelope()));
    Map<String, String> headers = headers(body);
    WebhookVerifier verifier = verifier(CURRENT);
    Map<String, String> mixed = strings("Webhook-Id", headers.get("webhook-id"),
        "WEBHOOK-TIMESTAMP", headers.get("webhook-timestamp"), "webhook-Signature", headers.get("webhook-signature"));
    assertEquals(WEBHOOK_ID, verifier.verify(WebhookHeaders.of(mixed), body).getWebhookId());
    Map<String, List<String>> multi = new LinkedHashMap<>();
    headers.forEach((name, value) -> multi.put(name, List.of(value)));
    assertEquals(WEBHOOK_ID, verifier.verify(WebhookHeaders.ofMultiValued(multi), body).getWebhookId());
    assertEquals(WEBHOOK_ID, verifier.verify(multi::get, body).getWebhookId());
    rejects(WebhookVerificationCode.INVALID_HEADER,
        () -> verifier.verify(WebhookHeaders.of(with(headers, "Webhook-Id", headers.get("webhook-id"))), body));
    Map<String, List<String>> repeated = new LinkedHashMap<>(multi);
    repeated.put("webhook-signature", List.of(headers.get("webhook-signature"), headers.get("webhook-signature")));
    rejects(WebhookVerificationCode.INVALID_HEADER, () -> verifier.verify(WebhookHeaders.ofMultiValued(repeated), body));
    for (String name : headers.keySet()) {
      Map<String, List<String>> empty = new LinkedHashMap<>(multi);
      empty.put(name, List.of());
      Map<String, List<String>> blank = new LinkedHashMap<>(multi);
      blank.put(name, List.of(""));
      WebhookHeaders absent = header -> header.equals(name) ? null : multi.get(header);
      for (WebhookHeaders value : List.of(WebhookHeaders.of(without(headers, name)), WebhookHeaders.of(with(headers, name, "")),
          WebhookHeaders.of(with(headers, name, null)), WebhookHeaders.ofMultiValued(empty),
          WebhookHeaders.ofMultiValued(blank), absent)) {
        rejects(WebhookVerificationCode.MISSING_HEADER, () -> verifier.verify(value, body));
      }
    }
  }

  @Test
  void stringAndByteBodiesAreVerifiedAsTheSameBytes() {
    String body = Json.stringify(envelope("note", "Grüße, 世界 👋"));
    byte[] bytes = utf8(body);
    WebhookHeaders signed = WebhookHeaders.of(headers(bytes));
    WebhookVerifier verifier = verifier(CURRENT);
    String eventId = verifier.verify(signed, body).getEvent().getEventId();
    assertEquals(eventId, verifier.verify(signed, bytes).getEvent().getEventId());
    byte[] framed = new byte[bytes.length + 8];
    System.arraycopy(bytes, 0, framed, 4, bytes.length);
    assertEquals(eventId, verifier.verify(signed, Arrays.copyOfRange(framed, 4, 4 + bytes.length)).getEvent().getEventId());
    rejects(WebhookVerificationCode.NO_MATCHING_SIGNATURE,
        () -> verifier.verify(signed, new String(bytes, StandardCharsets.ISO_8859_1)));
    // A string's lone surrogate is encoded as U+FFFD, as TextEncoder does.
    String lone = "{\"note\":\"a\uD800\"}";
    byte[] replaced = utf8("{\"note\":\"a\uFFFD\"}");
    assertEquals(WEBHOOK_ID, verifier.verifySignature(WebhookHeaders.of(headers(replaced)), lone).getWebhookId());
    // Correctly signed bytes that are not UTF-8 pass the signature check but are not an event.
    byte[] invalid = {0x7b, (byte) 0xff, 0x7d};
    WebhookHeaders invalidHeaders = WebhookHeaders.of(headers(invalid));
    assertEquals(TIMESTAMP, verifier.verifySignature(invalidHeaders, invalid).getTimestamp());
    rejects(WebhookVerificationCode.INVALID_BODY, () -> verifier.verify(invalidHeaders, invalid));
    // A leading byte order mark is not part of the event.
    byte[] marked = utf8("\uFEFF" + body);
    assertEquals(eventId, verifier.verify(WebhookHeaders.of(headers(marked)), marked).getEvent().getEventId());
  }

  @Test
  void bodiesOver4096BytesAndBodiesThatAreNotEventEnvelopesAreRejected() {
    String limit = sized(4096);
    String over = sized(4097);
    assertEquals(4096, utf8(limit).length);
    assertNotNull(verify(limit));
    rejects(WebhookVerificationCode.BODY_TOO_LARGE, () -> verify(over));
    rejects(WebhookVerificationCode.BODY_TOO_LARGE,
        () -> verifier(CURRENT).verify(WebhookHeaders.of(headers(utf8(over))), utf8(over)));
    String wide = Json.stringify(envelope("pad", "é".repeat(2100)));
    assertTrue(wide.length() <= 4096 && utf8(wide).length > 4096);
    rejects(WebhookVerificationCode.BODY_TOO_LARGE, () -> verify(wide));
    for (String body : List.of("not json", "[]", "null", "\"text\"", Json.stringify(envelope("subjectRef", null)),
        Json.stringify(envelope("subjectRef", map("id", UUID.randomUUID().toString()))),
        Json.stringify(envelope("eventId", "")), Json.stringify(envelope("eventType", 7L)),
        Json.stringify(without(envelope(), "projectId")))) {
      byte[] bytes = utf8(body);
      assertNotNull(verifier(CURRENT).verifySignature(WebhookHeaders.of(headers(bytes)), bytes), body);
      rejects(WebhookVerificationCode.INVALID_BODY, () -> verify(body));
    }
  }

  @Test
  void malformedSecretsAreConfigurationErrorsReportedWhenTheVerifierIsBuilt() {
    String encoded = CURRENT.substring("whsec_".length());
    // A 32-byte secret's Base64 ends in one pad character, and the character before it has two zero low bits.
    String alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    String nonCanonical = "whsec_" + encoded.substring(0, encoded.length() - 2)
        + alphabet.charAt(alphabet.indexOf(encoded.charAt(encoded.length() - 2)) | 1) + "=";
    List<List<String>> invalid = new ArrayList<>();
    for (String secret : List.of("", "whsec_", encoded, "whsec_not*base64", "whsec_YQ", "whsec_YR==", nonCanonical,
        CURRENT.substring(0, CURRENT.length() - 1), " " + CURRENT, CURRENT + " ", "WHSEC_" + encoded,
        newSecret(1), newSecret(13), newSecret(23), newSecret(65))) {
      invalid.add(List.of(secret));
    }
    invalid.add(List.of());
    invalid.add(List.of(CURRENT, "whsec_"));
    invalid.add(Arrays.asList(CURRENT, null));
    for (List<String> secrets : invalid) {
      rejects(WebhookVerificationCode.INVALID_SECRET, () -> WebhookVerifier.builder().secrets(secrets).build());
    }
    rejects(WebhookVerificationCode.INVALID_SECRET, () -> WebhookVerifier.builder().build());
    rejects(WebhookVerificationCode.INVALID_SECRET, () -> WebhookVerifier.builder().secrets((String) null).build());
    // Standard Webhooks secrets are 24 to 64 bytes; ConvoHop issues 32-byte secrets.
    byte[] body = utf8(Json.stringify(envelope()));
    for (int bytes : new int[] {24, 32, 64}) {
      String secret = newSecret(bytes);
      assertNotNull(verifier(secret).verify(WebhookHeaders.of(headers(body, List.of(secret), WEBHOOK_ID, TIMESTAMP)), body));
    }
  }

  @Test
  void failuresNeverEchoSecretsSignaturesOrTheBody() {
    String marker = "body-marker-7d1c";
    String body = Json.stringify(envelope("eventId", "", "note", marker));
    Map<String, String> signed = headers(utf8(body));
    String secretText = CURRENT.substring("whsec_".length());
    String mac = signed.get("webhook-signature").substring("v1,".length());
    List<Executable> failures = List.of(
        () -> verifier(CURRENT).verify(WebhookHeaders.of(signed), body),
        () -> verifier(newSecret(32)).verify(WebhookHeaders.of(signed), body),
        () -> verifier("whsec_" + secretText + "!"),
        () -> verifier(CURRENT).verify(WebhookHeaders.of(
            with(signed, "webhook-signature", String.join(" ", Collections.nCopies(9, "v1," + mac)))), body),
        () -> verifier(CURRENT).verify(WebhookHeaders.of(
            with(signed, "webhook-timestamp", TIMESTAMP + marker)), body));
    List<WebhookVerificationCode> codes = new ArrayList<>();
    for (Executable failure : failures) {
      WebhookVerificationException error = assertThrows(WebhookVerificationException.class, failure);
      codes.add(error.getCode());
      for (String secret : List.of(secretText, mac, marker)) {
        assertFalse(error.getMessage().contains(secret), error.getCode().name());
        assertFalse(error.toString().contains(secret), error.getCode().name());
      }
    }
    assertEquals(List.of(WebhookVerificationCode.INVALID_BODY, WebhookVerificationCode.NO_MATCHING_SIGNATURE,
        WebhookVerificationCode.INVALID_SECRET, WebhookVerificationCode.TOO_MANY_SIGNATURES,
        WebhookVerificationCode.INVALID_TIMESTAMP), codes);
    assertFalse(verifier(CURRENT).toString().contains(secretText));
    WebhookMessageNotificationEvent previewed = assertInstanceOf(WebhookMessageNotificationEvent.class,
        verify(Json.stringify(notification("notification.message", "preview", map("text", marker, "truncated", false))))
            .getEvent());
    WebhookNotificationPreview preview = previewed.getPreview();
    assertNotNull(preview);
    assertEquals(marker, preview.getText());
    assertFalse(preview.toString().contains(marker));
    assertFalse(previewed.toString().contains(marker));
  }

  @Test
  void invalidArgumentsThrowInsteadOfFailingVerification() {
    byte[] body = utf8(Json.stringify(envelope()));
    WebhookHeaders headers = WebhookHeaders.of(headers(body));
    WebhookVerifier verifier = verifier(CURRENT);
    assertThrows(IllegalArgumentException.class, () -> WebhookVerifier.builder().toleranceSeconds(-1));
    assertThrows(NullPointerException.class, () -> WebhookVerifier.builder().clock(null));
    assertThrows(NullPointerException.class, () -> WebhookVerifier.builder().secrets((String[]) null));
    assertThrows(NullPointerException.class, () -> WebhookVerifier.builder().secrets((List<String>) null));
    assertThrows(NullPointerException.class, () -> verifier.verify(headers, (byte[]) null));
    assertThrows(NullPointerException.class, () -> verifier.verify(headers, (String) null));
    assertThrows(NullPointerException.class, () -> verifier.verify(null, body));
    assertThrows(NullPointerException.class, () -> WebhookHeaders.of(null));
    assertThrows(NullPointerException.class, () -> WebhookHeaders.ofMultiValued(null));
  }

  private static void assertEnvelope(Map<String, Object> event, WebhookEvent parsed) {
    assertEquals(event.get("eventId"), parsed.getEventId());
    assertEquals(event.get("eventType"), parsed.getEventType());
    assertEquals(event.get("occurredAt"), parsed.getOccurredAt());
    assertEquals(event.get("projectId"), parsed.getProjectId());
    Map<String, Object> subject = Repo.object(event.get("subjectRef"));
    assertEquals(subject.get("id"), parsed.getSubjectRef().getId());
    assertEquals(subject.get("kind"), parsed.getSubjectRef().getKind());
  }

  static void assertNotification(Map<String, Object> event, WebhookEvent parsed) {
    String eventType = (String) event.get("eventType");
    assertTrue(parsed.isKnown(), eventType);
    assertEnvelope(event, parsed);
    WebhookNotificationEvent notification = assertInstanceOf(WebhookNotificationEvent.class, parsed);
    assertEquals(event.get("recipientId"), notification.getRecipientId());
    assertEquals(event.get("conversationId"), notification.getConversationId());
    assertEquals(event.get("senderId"), notification.getSenderId());
    assertEquals(event.get("connected"), notification.isConnected());
    switch (eventType) {
      case "notification.message": {
        WebhookMessageNotificationEvent message = assertInstanceOf(WebhookMessageNotificationEvent.class, parsed);
        assertEquals(event.get("messageId"), message.getMessageId());
        WebhookNotificationPreview preview = message.getPreview();
        if (event.containsKey("preview")) {
          Map<String, Object> expected = Repo.object(event.get("preview"));
          assertNotNull(preview);
          assertEquals(expected.get("text"), preview.getText());
          assertEquals(expected.get("truncated"), preview.isTruncated());
        } else {
          assertNull(preview);
        }
        break;
      }
      case "notification.call": {
        WebhookCallNotificationEvent call = assertInstanceOf(WebhookCallNotificationEvent.class, parsed);
        assertEquals(event.get("liveSessionId"), call.getLiveSessionId());
        assertEquals(event.get("alertId"), call.getAlertId());
        assertEquals(event.get("expiresAt"), call.getExpiresAt());
        assertEquals(event.get("mediaProfile"), call.getMediaProfile());
        break;
      }
      default: {
        assertEquals("notification.callCancelled", eventType);
        WebhookCallCancelledNotificationEvent cancelled =
            assertInstanceOf(WebhookCallCancelledNotificationEvent.class, parsed);
        assertEquals(event.get("liveSessionId"), cancelled.getLiveSessionId());
        assertEquals(event.get("alertId"), cancelled.getAlertId());
        assertEquals(event.get("expiresAt"), cancelled.getExpiresAt());
        assertEquals(event.get("mediaProfile"), cancelled.getMediaProfile());
        assertEquals(event.get("reason"), cancelled.getReason());
        assertEquals(List.of("ended", "expired").contains(event.get("reason")), cancelled.isMissedCall());
      }
    }
  }

  /** A resource event envelope with the given fields replaced. */
  private static Map<String, Object> envelope(Object... fields) {
    Map<String, Object> event = map("eventId", UUID.randomUUID().toString(), "eventType", "message.created",
        "occurredAt", "2026-10-10T12:00:00.000Z", "projectId", UUID.randomUUID().toString(),
        "subjectRef", map("id", UUID.randomUUID().toString(), "kind", "message"));
    event.putAll(map(fields));
    return event;
  }

  /** A notification event under the push payload contract (spec/push-payload/). */
  static Map<String, Object> notification(String eventType, Object... fields) {
    Map<String, Object> event = map("eventId", UUID.randomUUID().toString(), "eventType", eventType,
        "occurredAt", "2026-10-10T12:00:00.000Z", "projectId", UUID.randomUUID().toString(),
        "recipientId", UUID.randomUUID().toString(), "conversationId", UUID.randomUUID().toString(),
        "senderId", UUID.randomUUID().toString(), "connected", false);
    if (eventType.equals("notification.message")) {
      String messageId = UUID.randomUUID().toString();
      event.put("subjectRef", map("id", messageId, "kind", "message"));
      event.put("messageId", messageId);
    } else {
      String liveSessionId = UUID.randomUUID().toString();
      event.put("subjectRef", map("id", liveSessionId, "kind", "liveSession"));
      event.put("liveSessionId", liveSessionId);
      event.put("alertId", UUID.randomUUID().toString());
      event.put("expiresAt", "2026-10-10T12:00:45.000Z");
      event.put("mediaProfile", "AUDIO_VIDEO");
      if (eventType.equals("notification.callCancelled")) {
        event.put("reason", "answered");
      }
    }
    event.putAll(map(fields));
    return event;
  }

  private static Map<String, String> strings(String... entries) {
    Map<String, String> value = new LinkedHashMap<>();
    for (int index = 0; index < entries.length; index += 2) {
      value.put(entries[index], entries[index + 1]);
    }
    return value;
  }

  /** A copy of a map with entries replaced. */
  static <V> Map<String, V> with(Map<String, V> base, String key, V value) {
    Map<String, V> copy = new LinkedHashMap<>(base);
    copy.put(key, value);
    return copy;
  }

  private static Map<String, Object> with(Map<String, Object> base, String key, Object value, String key2, Object value2) {
    return with(with(base, key, value), key2, value2);
  }

  /** A copy of a map without a key. */
  static <V> Map<String, V> without(Map<String, V> base, String key) {
    Map<String, V> copy = new LinkedHashMap<>(base);
    copy.remove(key);
    return copy;
  }

  /** A body of exactly {@code bytes} ASCII bytes. */
  private static String sized(int bytes) {
    String base = Json.stringify(envelope("pad", ""));
    return base.replace("\"pad\":\"\"", "\"pad\":\"" + "x".repeat(bytes - base.length()) + "\"");
  }

  private static VerifiedWebhook verify(String body) {
    byte[] bytes = utf8(body);
    return verifier(CURRENT).verify(WebhookHeaders.of(headers(bytes)), body);
  }

  private static WebhookVerifier verifier(String... secrets) {
    return WebhookVerifier.builder().secrets(secrets).clock(CLOCK).build();
  }

  private static WebhookHeaders at(byte[] body, long timestamp) {
    return WebhookHeaders.of(headers(body, List.of(CURRENT), WEBHOOK_ID, timestamp));
  }

  private static Map<String, String> headers(byte[] body) {
    return headers(body, List.of(CURRENT), WEBHOOK_ID, TIMESTAMP);
  }

  /** Headers that sign {@code body} with each signer. */
  private static Map<String, String> headers(byte[] body, List<String> signers, String id, long timestamp) {
    String stamp = Long.toString(timestamp);
    StringJoiner signatures = new StringJoiner(" ");
    for (String signer : signers) {
      signatures.add(sign(signer, id, stamp, body));
    }
    return strings("webhook-id", id, "webhook-timestamp", stamp, "webhook-signature", signatures.toString());
  }

  private static String header(Map<String, String> headers, String name) {
    for (Map.Entry<String, String> header : headers.entrySet()) {
      if (header.getKey().toLowerCase(Locale.ROOT).equals(name)) {
        return header.getValue();
      }
    }
    throw new AssertionError("Missing " + name);
  }

  /** Signs independently of the SDK: HMAC-SHA256 over {@code {id}.{timestamp}.{body}} bytes. */
  private static String sign(String secret, String id, String timestamp, byte[] body) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(Base64.getDecoder().decode(secret.substring("whsec_".length())), "HmacSHA256"));
      mac.update(utf8(id + "." + timestamp + "."));
      return "v1," + Base64.getEncoder().encodeToString(mac.doFinal(body));
    } catch (GeneralSecurityException error) {
      throw new AssertionError(error);
    }
  }

  private static String newSecret(int bytes) {
    byte[] key = new byte[bytes];
    RANDOM.nextBytes(key);
    return "whsec_" + Base64.getEncoder().encodeToString(key);
  }

  private static byte[] utf8(String text) {
    return text.getBytes(StandardCharsets.UTF_8);
  }

  private static void rejects(WebhookVerificationCode code, Executable run) {
    WebhookVerificationException error = assertThrows(WebhookVerificationException.class, run, code.name());
    assertEquals(code, error.getCode(), error.getMessage());
  }
}
