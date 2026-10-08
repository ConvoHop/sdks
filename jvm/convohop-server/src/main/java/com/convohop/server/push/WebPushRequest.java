package com.convohop.server.push;

import com.convohop.server.internal.Json;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/**
 * A Web Push message from {@link PushPayloads#webPush}. Your Web Push library encrypts the payload (RFC 8291), signs
 * with VAPID and sends it with these RFC 8030 headers. Where the library sets {@code TTL}, {@code Urgency} or {@code
 * Topic} from its own options, pass the values there, or its defaults replace them. {@link #toString()} omits the
 * payload.
 */
public final class WebPushRequest {
  private final long ttlSeconds;
  private final String urgency;
  private final @Nullable String topic;
  private final String payload;

  WebPushRequest(long ttlSeconds, String urgency, @Nullable String topic, String payload) {
    this.ttlSeconds = ttlSeconds;
    this.urgency = urgency;
    this.topic = topic;
    this.payload = payload;
  }

  /**
   * The headers: {@code TTL}, {@code Urgency} and, for calls, {@code Topic}.
   *
   * @return the headers, in that order
   */
  public Map<String, String> getHeaders() {
    Map<String, String> headers = new LinkedHashMap<>();
    headers.put("TTL", String.valueOf(ttlSeconds));
    headers.put("Urgency", urgency);
    if (topic != null) {
      headers.put("Topic", topic);
    }
    return Collections.unmodifiableMap(headers);
  }

  /**
   * The {@code TTL}.
   *
   * @return the TTL in seconds
   */
  public long getTtlSeconds() {
    return ttlSeconds;
  }

  /**
   * The {@code Urgency}: {@code normal} for messages and {@code high} for calls.
   *
   * @return the urgency
   */
  public String getUrgency() {
    return urgency;
  }

  /**
   * The {@code Topic} of calls and cancellations: the ring's collapse key.
   *
   * @return the topic, or null for messages
   */
  public @Nullable String getTopic() {
    return topic;
  }

  /**
   * The JSON payload to encrypt: at most 3993 bytes, the RFC 8291 plaintext limit.
   *
   * @return the payload
   */
  public String getPayload() {
    return payload;
  }

  @Override
  public String toString() {
    return "WebPushRequest{headers=" + getHeaders() + ", payloadBytes=" + Json.utf8Length(payload) + "}";
  }
}
