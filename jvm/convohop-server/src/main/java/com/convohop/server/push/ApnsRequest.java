package com.convohop.server.push;

import com.convohop.server.internal.Json;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/**
 * An APNs request: an alert from {@link PushPayloads#apnsAlert} or a VoIP push from {@link PushPayloads#apnsVoip}.
 * Your APNs client adds {@code authorization} and sends the payload to {@code /3/device/<token>} with these headers.
 * {@link #toString()} omits the payload.
 */
public final class ApnsRequest {
  private final String pushType;
  private final String topic;
  private final long expiration;
  private final @Nullable String collapseId;
  private final String payload;

  ApnsRequest(String pushType, String topic, long expiration, @Nullable String collapseId, String payload) {
    this.pushType = pushType;
    this.topic = topic;
    this.expiration = expiration;
    this.collapseId = collapseId;
    this.payload = payload;
  }

  /**
   * The HTTP/2 headers: {@code apns-push-type}, {@code apns-topic}, {@code apns-priority}, {@code apns-expiration}
   * and, for calls and missed calls, {@code apns-collapse-id}.
   *
   * @return the headers, in that order
   */
  public Map<String, String> getHeaders() {
    Map<String, String> headers = new LinkedHashMap<>();
    headers.put("apns-push-type", pushType);
    headers.put("apns-topic", topic);
    headers.put("apns-priority", "10");
    headers.put("apns-expiration", String.valueOf(expiration));
    if (collapseId != null) {
      headers.put("apns-collapse-id", collapseId);
    }
    return Collections.unmodifiableMap(headers);
  }

  /**
   * The {@code apns-push-type}: {@code alert} or {@code voip}.
   *
   * @return the push type
   */
  public String getPushType() {
    return pushType;
  }

  /**
   * The {@code apns-topic}: the bundle ID for alerts, and the bundle ID followed by {@code .voip} for VoIP pushes.
   *
   * @return the topic
   */
  public String getTopic() {
    return topic;
  }

  /**
   * The {@code apns-priority}: 10, for immediate delivery.
   *
   * @return the priority
   */
  public int getPriority() {
    return 10;
  }

  /**
   * The {@code apns-expiration}: when APNs stops trying to deliver.
   *
   * @return Unix seconds
   */
  public long getExpiration() {
    return expiration;
  }

  /**
   * The {@code apns-collapse-id} of calls and missed calls: the ring's collapse key, so a missed-call alert replaces
   * the ring's incoming-call alert.
   *
   * @return the collapse ID, or null for messages and VoIP pushes
   */
  public @Nullable String getCollapseId() {
    return collapseId;
  }

  /**
   * The JSON payload: at most 4096 bytes for alerts and 5120 bytes for VoIP pushes.
   *
   * @return the payload
   */
  public String getPayload() {
    return payload;
  }

  @Override
  public String toString() {
    return "ApnsRequest{headers=" + getHeaders() + ", payloadBytes=" + Json.utf8Length(payload) + "}";
  }
}
