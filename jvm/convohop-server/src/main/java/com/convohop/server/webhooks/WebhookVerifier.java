package com.convohop.server.webhooks;

import com.convohop.server.internal.Json;
import com.convohop.server.internal.Wire;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.jspecify.annotations.Nullable;

/**
 * Verifies ConvoHop webhook deliveries (Standard Webhooks, symmetric {@code v1} signatures). Pass the exact request
 * body, respond {@code 2xx} within 5 seconds, then process, and de-duplicate on {@code webhook-id}.
 *
 * <pre>{@code
 * WebhookVerifier verifier = WebhookVerifier.builder().secrets(System.getenv("CONVOHOP_WEBHOOK_SECRET")).build();
 * VerifiedWebhook delivery = verifier.verify(WebhookHeaders.ofMultiValued(requestHeaders), requestBody);
 * }</pre>
 *
 * <p>Failures throw {@link WebhookVerificationException}. Its message never contains secrets, signatures or the body.
 * A verifier is immutable and thread-safe.
 */
public final class WebhookVerifier {
  private static final int BODY_LIMIT = 4096;
  private static final int SIGNATURE_LIMIT = 8;
  private static final int SIGNATURE_BYTES = 32;
  private static final String SECRET_PREFIX = "whsec_";
  private static final int SECRET_MIN_BYTES = 24;
  private static final int SECRET_MAX_BYTES = 64;
  private static final int TIMESTAMP_DIGITS = 15;
  private static final String HMAC = "HmacSHA256";

  private final List<SecretKeySpec> keys;
  private final long toleranceSeconds;
  private final Clock clock;

  private WebhookVerifier(List<SecretKeySpec> keys, long toleranceSeconds, Clock clock) {
    this.keys = keys;
    this.toleranceSeconds = toleranceSeconds;
    this.clock = clock;
  }

  /**
   * Starts a verifier.
   *
   * @return a builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /**
   * Verifies the signature and timestamp, then parses the metadata-only event.
   *
   * @param headers the request headers
   * @param body the exact request body bytes, never re-serialized JSON
   * @return the delivery
   * @throws WebhookVerificationException if the delivery fails verification or its body is not an event envelope
   */
  public VerifiedWebhook verify(WebhookHeaders headers, byte[] body) {
    return delivery(signature(headers, bytes(body)));
  }

  /**
   * Verifies the signature and timestamp, then parses the metadata-only event.
   *
   * @param headers the request headers
   * @param body the exact UTF-8 decoding of the request body, never re-serialized JSON
   * @return the delivery
   * @throws WebhookVerificationException if the delivery fails verification or its body is not an event envelope
   */
  public VerifiedWebhook verify(WebhookHeaders headers, String body) {
    return delivery(signature(headers, bytes(body)));
  }

  /**
   * Verifies only the signature and timestamp, for bodies you parse yourself.
   *
   * @param headers the request headers
   * @param body the exact request body bytes, never re-serialized JSON
   * @return the delivery's {@code webhook-id} and {@code webhook-timestamp}
   * @throws WebhookVerificationException if the delivery fails verification
   */
  public WebhookSignature verifySignature(WebhookHeaders headers, byte[] body) {
    Signed signed = signature(headers, bytes(body));
    return new WebhookSignature(signed.webhookId, signed.timestamp);
  }

  /**
   * Verifies only the signature and timestamp, for bodies you parse yourself.
   *
   * @param headers the request headers
   * @param body the exact UTF-8 decoding of the request body, never re-serialized JSON
   * @return the delivery's {@code webhook-id} and {@code webhook-timestamp}
   * @throws WebhookVerificationException if the delivery fails verification
   */
  public WebhookSignature verifySignature(WebhookHeaders headers, String body) {
    Signed signed = signature(headers, bytes(body));
    return new WebhookSignature(signed.webhookId, signed.timestamp);
  }

  @Override
  public String toString() {
    return "WebhookVerifier{secrets=" + keys.size() + " redacted, toleranceSeconds=" + toleranceSeconds + "}";
  }

  private static VerifiedWebhook delivery(Signed signed) {
    return new VerifiedWebhook(signed.webhookId, signed.timestamp, WebhookEvents.parse(signed.body));
  }

  /** The body's bytes, or null when it exceeds the limit. */
  private static byte @Nullable [] bytes(byte[] body) {
    Wire.nonNull(body, "body");
    // Copied so the caller can't change the bytes between the signature check and parsing.
    return body.length > BODY_LIMIT ? null : body.clone();
  }

  private static byte @Nullable [] bytes(String body) {
    Wire.nonNull(body, "body");
    // A string's UTF-8 encoding is at least as long as the string, so oversized strings are rejected before encoding.
    if (body.length() > BODY_LIMIT) {
      return null;
    }
    byte[] encoded = Json.utf8(body);
    return encoded.length > BODY_LIMIT ? null : encoded;
  }

  private Signed signature(WebhookHeaders headers, byte @Nullable [] body) {
    Wire.nonNull(headers, "headers");
    String webhookId = header(headers, "webhook-id");
    String stamp = header(headers, "webhook-timestamp");
    List<String> entries = entries(header(headers, "webhook-signature"));
    if (!digits(stamp)) {
      throw failure(WebhookVerificationCode.INVALID_TIMESTAMP, "webhook-timestamp must be integer Unix seconds");
    }
    long timestamp = Long.parseLong(stamp);
    long age = clock.instant().getEpochSecond() - timestamp;
    if (age > toleranceSeconds) {
      throw failure(WebhookVerificationCode.TIMESTAMP_EXPIRED, "webhook-timestamp is older than the tolerance");
    }
    if (-age > toleranceSeconds) {
      throw failure(
          WebhookVerificationCode.TIMESTAMP_FUTURE, "webhook-timestamp is further ahead than the tolerance");
    }
    if (body == null) {
      throw failure(WebhookVerificationCode.BODY_TOO_LARGE, "Webhook body exceeds " + BODY_LIMIT + " bytes");
    }
    if (entries.size() > SIGNATURE_LIMIT) {
      throw failure(
          WebhookVerificationCode.TOO_MANY_SIGNATURES,
          "webhook-signature has more than " + SIGNATURE_LIMIT + " entries");
    }
    List<byte[]> offered = new ArrayList<>();
    for (String entry : entries) {
      int comma = entry.indexOf(',');
      if (comma <= 0 || !"v1".equals(entry.substring(0, comma))) {
        continue;
      }
      byte[] candidate = base64(entry.substring(comma + 1));
      if (candidate != null && candidate.length == SIGNATURE_BYTES) {
        offered.add(candidate);
      }
    }
    byte[] prefix = Json.utf8(webhookId + "." + stamp + ".");
    for (SecretKeySpec key : keys) {
      byte[] expected = hmac(key, prefix, body);
      for (byte[] candidate : offered) {
        if (MessageDigest.isEqual(expected, candidate)) {
          return new Signed(webhookId, timestamp, body);
        }
      }
    }
    throw failure(
        WebhookVerificationCode.NO_MATCHING_SIGNATURE, "No v1 webhook signature matches the configured secrets");
  }

  private static String header(WebhookHeaders headers, String name) {
    List<String> values = headers.values(name);
    if (values != null && values.size() > 1) {
      throw failure(WebhookVerificationCode.INVALID_HEADER, "Repeated " + name + " header");
    }
    @Nullable String value = values == null || values.isEmpty() ? null : values.get(0);
    if (value == null || value.isEmpty()) {
      throw failure(WebhookVerificationCode.MISSING_HEADER, "Missing " + name + " header");
    }
    return value;
  }

  /** The non-empty, space-separated entries, stopping once there are too many to verify. */
  private static List<String> entries(String header) {
    List<String> entries = new ArrayList<>();
    int start = 0;
    while (start <= header.length() && entries.size() <= SIGNATURE_LIMIT) {
      int end = header.indexOf(' ', start);
      if (end < 0) {
        end = header.length();
      }
      if (end > start) {
        entries.add(header.substring(start, end));
      }
      start = end + 1;
    }
    return entries;
  }

  private static boolean digits(String value) {
    if (value.isEmpty() || value.length() > TIMESTAMP_DIGITS) {
      return false;
    }
    for (int index = 0; index < value.length(); index++) {
      char c = value.charAt(index);
      if (c < '0' || c > '9') {
        return false;
      }
    }
    return true;
  }

  /** Strict padded standard Base64; non-canonical encodings are rejected so byte equality matches text equality. */
  private static byte @Nullable [] base64(String value) {
    int length = value.length();
    if (length % 4 != 0) {
      return null;
    }
    int padding = 0;
    if (length > 0 && value.charAt(length - 1) == '=') {
      padding = length > 1 && value.charAt(length - 2) == '=' ? 2 : 1;
    }
    for (int index = 0; index < length - padding; index++) {
      char c = value.charAt(index);
      if (!((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '+' || c == '/')) {
        return null;
      }
    }
    byte[] bytes;
    try {
      bytes = Base64.getDecoder().decode(value);
    } catch (IllegalArgumentException invalid) {
      return null;
    }
    return Base64.getEncoder().encodeToString(bytes).equals(value) ? bytes : null;
  }

  private static byte[] hmac(SecretKeySpec key, byte[] prefix, byte[] body) {
    try {
      Mac mac = Mac.getInstance(HMAC);
      mac.init(key);
      mac.update(prefix);
      mac.update(body);
      return mac.doFinal();
    } catch (GeneralSecurityException unavailable) {
      throw new IllegalStateException("Webhook verification requires " + HMAC, unavailable);
    }
  }

  private static WebhookVerificationException failure(WebhookVerificationCode code, String message) {
    return new WebhookVerificationException(code, message);
  }

  private static final class Signed {
    final String webhookId;
    final long timestamp;
    final byte[] body;

    Signed(String webhookId, long timestamp, byte[] body) {
      this.webhookId = webhookId;
      this.timestamp = timestamp;
      this.body = body;
    }
  }

  /** Configures a {@link WebhookVerifier}. */
  public static final class Builder {
    private List<@Nullable String> secrets = Collections.emptyList();
    private long toleranceSeconds = 300;
    private Clock clock = Clock.systemUTC();

    private Builder() {}

    /**
     * Sets the endpoint's {@code whsec_} secrets: the current one and, during a rotation, the next or replaced one.
     * Replaces secrets set earlier.
     *
     * @param secrets the secrets; {@link #build()} rejects null or malformed ones
     * @return this builder
     */
    public Builder secrets(@Nullable String... secrets) {
      this.secrets = new ArrayList<>(Arrays.asList(Wire.nonNull(secrets, "secrets")));
      return this;
    }

    /**
     * Sets the endpoint's {@code whsec_} secrets: the current one and, during a rotation, the next or replaced one.
     * Replaces secrets set earlier.
     *
     * @param secrets the secrets; {@link #build()} rejects null or malformed ones
     * @return this builder
     */
    public Builder secrets(Collection<? extends @Nullable String> secrets) {
      this.secrets = new ArrayList<>(Wire.nonNull(secrets, "secrets"));
      return this;
    }

    /**
     * Sets the allowed distance between {@code webhook-timestamp} and now, in whole seconds, inclusive. Defaults to
     * 300.
     *
     * @param toleranceSeconds the tolerance
     * @return this builder
     * @throws IllegalArgumentException if the tolerance is negative
     */
    public Builder toleranceSeconds(long toleranceSeconds) {
      if (toleranceSeconds < 0) {
        throw new IllegalArgumentException("Webhook tolerance must be a non-negative integer");
      }
      this.toleranceSeconds = toleranceSeconds;
      return this;
    }

    /**
     * Sets the verifier's clock. Defaults to {@link Clock#systemUTC()}.
     *
     * @param clock the clock
     * @return this builder
     */
    public Builder clock(Clock clock) {
      this.clock = Wire.nonNull(clock, "clock");
      return this;
    }

    /**
     * Decodes the secrets and builds the verifier.
     *
     * @return the verifier
     * @throws WebhookVerificationException with {@link WebhookVerificationCode#INVALID_SECRET} if no secret is set or
     *     one is not {@code whsec_} followed by padded standard Base64 of 24 to 64 bytes
     */
    public WebhookVerifier build() {
      if (secrets.isEmpty()) {
        throw failure(WebhookVerificationCode.INVALID_SECRET, "At least one webhook secret is required");
      }
      List<SecretKeySpec> keys = new ArrayList<>(secrets.size());
      for (String secret : secrets) {
        byte[] key = secret != null && secret.startsWith(SECRET_PREFIX)
            ? base64(secret.substring(SECRET_PREFIX.length()))
            : null;
        if (key == null || key.length < SECRET_MIN_BYTES || key.length > SECRET_MAX_BYTES) {
          throw failure(
              WebhookVerificationCode.INVALID_SECRET,
              "A webhook secret must be whsec_ followed by padded standard Base64 of 24 to 64 bytes");
        }
        keys.add(new SecretKeySpec(key, HMAC));
        Arrays.fill(key, (byte) 0);
      }
      return new WebhookVerifier(Collections.unmodifiableList(keys), toleranceSeconds, clock);
    }
  }
}
