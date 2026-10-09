package com.convohop.server.push;

import com.convohop.server.internal.Json;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/**
 * An FCM data message from {@link PushPayloads#fcm}. {@link #getMessage()} is an FCM HTTP v1 {@code messages:send}
 * message without a target: add {@code token} or {@code fid}. With the Firebase Admin SDK, put {@link #getData()}
 * and set the Android priority, TTL and collapse key from the getters. {@link #toString()} omits the data.
 */
public final class FcmRequest {
  private final Map<String, String> data;
  private final long ttlSeconds;
  private final @Nullable String collapseKey;

  FcmRequest(String convohop, long ttlSeconds, @Nullable String collapseKey) {
    this.data = Collections.singletonMap("convohop", convohop);
    this.ttlSeconds = ttlSeconds;
    this.collapseKey = collapseKey;
  }

  /**
   * The data: {@code convohop}, the push metadata as JSON. At most 4096 bytes as JSON.
   *
   * @return the data
   */
  public Map<String, String> getData() {
    return data;
  }

  /**
   * The Android message priority: {@code HIGH}.
   *
   * @return the priority
   */
  public String getPriority() {
    return "HIGH";
  }

  /**
   * The Android TTL. The Firebase Admin SDK for Java takes it in milliseconds.
   *
   * @return the TTL in seconds
   */
  public long getTtlSeconds() {
    return ttlSeconds;
  }

  /**
   * The Android collapse key of calls and cancellations: the ring's collapse key.
   *
   * @return the collapse key, or null for messages
   */
  public @Nullable String getCollapseKey() {
    return collapseKey;
  }

  /**
   * The FCM HTTP v1 message without a target, as JSON: {@code data}, then {@code android} with {@code priority},
   * {@code ttl} and, for calls, {@code collapse_key}.
   *
   * @return the message
   */
  public String getMessage() {
    Map<String, Object> android = new LinkedHashMap<>();
    android.put("priority", getPriority());
    android.put("ttl", ttlSeconds + "s");
    if (collapseKey != null) {
      android.put("collapse_key", collapseKey);
    }
    Map<String, Object> message = new LinkedHashMap<>();
    message.put("data", data);
    message.put("android", android);
    return Json.stringify(message);
  }

  @Override
  public String toString() {
    return "FcmRequest{priority="
        + getPriority()
        + ", ttlSeconds="
        + ttlSeconds
        + ", collapseKey="
        + collapseKey
        + ", dataBytes="
        + Json.utf8Length(Json.stringify(data))
        + "}";
  }
}
