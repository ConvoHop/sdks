package com.convohop.examples;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** Webhook deliveries signed the way ConvoHop signs them. */
final class Deliveries {
  private static final SecureRandom RANDOM = new SecureRandom();

  private Deliveries() {}

  static String newSecret() {
    byte[] key = new byte[32];
    RANDOM.nextBytes(key);
    return "whsec_" + Base64.getEncoder().encodeToString(key);
  }

  static String newWebhookId() {
    return "msg_" + UUID.randomUUID();
  }

  /** The headers of a delivery: Standard Webhooks v1, HMAC-SHA256 over {@code id.timestamp.body}. */
  static Map<String, String> sign(String webhookId, String body, String secret) {
    String timestamp = Long.toString(Instant.now().getEpochSecond());
    byte[] key = Base64.getDecoder().decode(secret.substring("whsec_".length()));
    byte[] signature;
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(key, "HmacSHA256"));
      signature = mac.doFinal((webhookId + "." + timestamp + "." + body).getBytes(StandardCharsets.UTF_8));
    } catch (GeneralSecurityException error) {
      throw new IllegalStateException(error);
    }
    Map<String, String> headers = new LinkedHashMap<>();
    headers.put("content-type", "application/json");
    headers.put("webhook-id", webhookId);
    headers.put("webhook-timestamp", timestamp);
    headers.put("webhook-signature", "v1," + Base64.getEncoder().encodeToString(signature));
    return headers;
  }
}
