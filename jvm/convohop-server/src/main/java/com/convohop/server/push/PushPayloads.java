package com.convohop.server.push;

import com.convohop.server.internal.Json;
import com.convohop.server.internal.Rfc3339;
import com.convohop.server.internal.Wire;
import com.convohop.server.webhooks.WebhookCallCancelledNotificationEvent;
import com.convohop.server.webhooks.WebhookCallNotificationEvent;
import com.convohop.server.webhooks.WebhookMessageNotificationEvent;
import com.convohop.server.webhooks.WebhookNotificationEvent;
import com.convohop.server.webhooks.WebhookNotificationPreview;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.OptionalLong;
import java.util.function.Function;
import java.util.function.IntFunction;
import java.util.function.ToIntFunction;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * Builds provider requests from per-recipient notification events ({@code notification.message}, {@code
 * notification.call} and {@code notification.callCancelled}), as {@link
 * com.convohop.server.webhooks.WebhookVerifier#verify} returns them or {@link WebhookNotificationEvent#parse}
 * validates them. The contract is {@code spec/push-payload/}.
 *
 * <p>Each builder returns null when the event doesn't apply to the platform or is stale. Payloads are metadata-only
 * unless you set a title or body, or the event carries an opted-in message preview. Every payload carries a {@code
 * convohop} object: the event's fields without {@code subjectRef}, {@code connected} and {@code preview}. APNs VoIP,
 * FCM and Web Push payloads also carry the visible {@code title} and {@code body} there, because they have no visible
 * alert of their own. A payload that exceeds its platform's limit has its body, then its title, shortened to the
 * longest prefix that fits followed by {@code …}.
 */
public final class PushPayloads {
  // Payload limits in UTF-8 bytes. Web Push: RFC 8291's plaintext limit for the 4096-byte body push services accept,
  // less the encryption header (86), AEAD tag (16) and padding delimiter (1).
  private static final int APNS_ALERT_LIMIT = 4096;
  private static final int APNS_VOIP_LIMIT = 5120;
  private static final int FCM_LIMIT = 4096;
  private static final int WEB_PUSH_LIMIT = 4096 - 86 - 16 - 1;
  // Lifetimes in seconds: messages and missed calls stay relevant for a day; no platform stores longer than 28 days.
  private static final long NOTICE_LIFETIME = 86_400;
  private static final long MAX_LIFETIME = 2_419_200;
  private static final Pattern BUNDLE_ID = Pattern.compile("[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*");
  private static final int BUNDLE_ID_LIMIT = 155;
  private static final String ELLIPSIS = "\u2026";

  private PushPayloads() {}

  /**
   * An APNs alert with default options. See {@link #apnsAlert(WebhookNotificationEvent, String, PushOptions)}.
   *
   * @param event the notification event
   * @param bundleId the app's bundle ID: the {@code apns-topic}
   * @return the request, or null when the event is a cancellation that isn't a missed call, or is stale
   * @throws IllegalArgumentException if the bundle ID isn't an app bundle ID
   */
  public static @Nullable ApnsRequest apnsAlert(WebhookNotificationEvent event, String bundleId) {
    return apnsAlert(event, bundleId, PushOptions.defaults());
  }

  /**
   * An APNs alert for a message, an incoming call, or a missed call (a cancellation with reason {@code ended} or
   * {@code expired}). The payload is at most 4096 bytes.
   *
   * @param event the notification event
   * @param bundleId the app's bundle ID: the {@code apns-topic}
   * @param options the options
   * @return the request, or null when the event is a cancellation that isn't a missed call, or is stale
   * @throws IllegalArgumentException if the bundle ID isn't an app bundle ID
   */
  public static @Nullable ApnsRequest apnsAlert(
      WebhookNotificationEvent event, String bundleId, PushOptions options) {
    Wire.nonNull(event, "event");
    String topic = bundleId(bundleId);
    Wire.nonNull(options, "options");
    if (event instanceof WebhookCallCancelledNotificationEvent
        && !((WebhookCallCancelledNotificationEvent) event).isMissedCall()) {
      return null;
    }
    Lifetime life = lifetime(event, options);
    if (life == null) {
      return null;
    }
    String collapseId = collapseKey(event);
    String key =
        event instanceof WebhookMessageNotificationEvent
            ? "CONVOHOP_MESSAGE"
            : event instanceof WebhookCallNotificationEvent ? "CONVOHOP_CALL" : "CONVOHOP_MISSED_CALL";
    Map<String, Object> convohop = data(event, null);
    return fit(
        APNS_ALERT_LIMIT,
        text(event, options),
        text -> {
          Map<String, Object> alert = new LinkedHashMap<>();
          if (text.title != null) {
            alert.put("title", text.title);
          }
          if (text.body == null) {
            alert.put("loc-key", key);
          } else {
            alert.put("body", text.body);
          }
          Map<String, Object> aps = new LinkedHashMap<>();
          aps.put("alert", alert);
          aps.put("sound", "default");
          aps.put("mutable-content", 1);
          aps.put("thread-id", event.getConversationId());
          Map<String, Object> payload = new LinkedHashMap<>();
          payload.put("aps", aps);
          payload.put("convohop", convohop);
          return new ApnsRequest("alert", topic, life.expiration, collapseId, Json.stringify(payload));
        },
        request -> Json.utf8Length(request.getPayload()));
  }

  /**
   * An APNs VoIP push with default options. See {@link #apnsVoip(WebhookNotificationEvent, String, PushOptions)}.
   *
   * @param event the notification event
   * @param bundleId the app's bundle ID; the {@code apns-topic} is the bundle ID followed by {@code .voip}
   * @return the request, or null when the event isn't an incoming call, or is stale
   * @throws IllegalArgumentException if the bundle ID isn't an app bundle ID
   */
  public static @Nullable ApnsRequest apnsVoip(WebhookNotificationEvent event, String bundleId) {
    return apnsVoip(event, bundleId, PushOptions.defaults());
  }

  /**
   * An APNs VoIP push for an incoming call. iOS requires you to report every VoIP push to CallKit as a call. The
   * payload is at most 5120 bytes.
   *
   * @param event the notification event
   * @param bundleId the app's bundle ID; the {@code apns-topic} is the bundle ID followed by {@code .voip}
   * @param options the options
   * @return the request, or null when the event isn't an incoming call, or is stale
   * @throws IllegalArgumentException if the bundle ID isn't an app bundle ID
   */
  public static @Nullable ApnsRequest apnsVoip(
      WebhookNotificationEvent event, String bundleId, PushOptions options) {
    Wire.nonNull(event, "event");
    String topic = bundleId(bundleId) + ".voip";
    Wire.nonNull(options, "options");
    if (!(event instanceof WebhookCallNotificationEvent)) {
      return null;
    }
    Lifetime life = lifetime(event, options);
    if (life == null) {
      return null;
    }
    return fit(
        APNS_VOIP_LIMIT,
        text(event, options),
        text -> new ApnsRequest("voip", topic, life.expiration, null, convohop(event, text)),
        request -> Json.utf8Length(request.getPayload()));
  }

  /**
   * An FCM data message with default options. See {@link #fcm(WebhookNotificationEvent, PushOptions)}.
   *
   * @param event the notification event
   * @return the request, or null when the event is stale
   */
  public static @Nullable FcmRequest fcm(WebhookNotificationEvent event) {
    return fcm(event, PushOptions.defaults());
  }

  /**
   * An FCM data message for any notification event. The data is at most 4096 bytes as JSON.
   *
   * @param event the notification event
   * @param options the options
   * @return the request, or null when the event is stale
   */
  public static @Nullable FcmRequest fcm(WebhookNotificationEvent event, PushOptions options) {
    Wire.nonNull(event, "event");
    Wire.nonNull(options, "options");
    Lifetime life = lifetime(event, options);
    if (life == null) {
      return null;
    }
    String collapseKey = collapseKey(event);
    return fit(
        FCM_LIMIT,
        text(event, options),
        text -> new FcmRequest(Json.stringify(data(event, text)), life.ttl, collapseKey),
        request -> Json.utf8Length(Json.stringify(request.getData())));
  }

  /**
   * A Web Push message with default options. See {@link #webPush(WebhookNotificationEvent, PushOptions)}.
   *
   * @param event the notification event
   * @return the request, or null when the event is stale
   */
  public static @Nullable WebPushRequest webPush(WebhookNotificationEvent event) {
    return webPush(event, PushOptions.defaults());
  }

  /**
   * A Web Push message for any notification event. The payload is at most 3993 bytes, the RFC 8291 plaintext limit.
   *
   * @param event the notification event
   * @param options the options
   * @return the request, or null when the event is stale
   */
  public static @Nullable WebPushRequest webPush(WebhookNotificationEvent event, PushOptions options) {
    Wire.nonNull(event, "event");
    Wire.nonNull(options, "options");
    Lifetime life = lifetime(event, options);
    if (life == null) {
      return null;
    }
    String topic = collapseKey(event);
    String urgency = event instanceof WebhookMessageNotificationEvent ? "normal" : "high";
    return fit(
        WEB_PUSH_LIMIT,
        text(event, options),
        text -> new WebPushRequest(life.ttl, urgency, topic, convohop(event, text)),
        request -> Json.utf8Length(request.getPayload()));
  }

  private static String bundleId(String bundleId) {
    Wire.nonNull(bundleId, "bundleId");
    if (bundleId.length() > BUNDLE_ID_LIMIT || !BUNDLE_ID.matcher(bundleId).matches()) {
      throw new IllegalArgumentException("bundleId must be an app bundle ID");
    }
    return bundleId;
  }

  /** The visible text: the title, and the body or else the message preview. */
  private static Text text(WebhookNotificationEvent event, PushOptions options) {
    String body = options.getBody();
    if (body == null && options.isPreview() && event instanceof WebhookMessageNotificationEvent) {
      WebhookNotificationPreview preview = ((WebhookMessageNotificationEvent) event).getPreview();
      if (preview != null) {
        body = preview.getText() + (preview.isTruncated() ? ELLIPSIS : "");
      }
    }
    return new Text(options.getTitle(), body);
  }

  /** The remaining lifetime, capped at 28 days, or null when the event is stale. */
  private static @Nullable Lifetime lifetime(WebhookNotificationEvent event, PushOptions options) {
    long now = options.getClock().instant().getEpochSecond();
    long ttl = Math.min(deadline(event) - now, MAX_LIFETIME);
    return ttl > 0 ? new Lifetime(ttl, now + ttl) : null;
  }

  /** Unix seconds until which delivering the event is still useful. */
  private static long deadline(WebhookNotificationEvent event) {
    if (event instanceof WebhookCallNotificationEvent) {
      return seconds(((WebhookCallNotificationEvent) event).getExpiresAt());
    }
    if (event instanceof WebhookCallCancelledNotificationEvent
        && !((WebhookCallCancelledNotificationEvent) event).isMissedCall()) {
      return seconds(((WebhookCallCancelledNotificationEvent) event).getExpiresAt());
    }
    // Messages and missed calls.
    return seconds(event.getOccurredAt()) + NOTICE_LIFETIME;
  }

  private static long seconds(String timestamp) {
    OptionalLong value = Rfc3339.epochSeconds(timestamp);
    if (!value.isPresent()) {
      throw new IllegalStateException("ConvoHop push: a validated timestamp didn't parse");
    }
    return value.getAsLong();
  }

  /**
   * Calls and cancellations collapse per ring: 32 lowercase hex digits, valid as an APNs collapse ID, FCM collapse
   * key and Web Push topic.
   */
  private static @Nullable String collapseKey(WebhookNotificationEvent event) {
    if (event instanceof WebhookCallNotificationEvent) {
      return ((WebhookCallNotificationEvent) event).getAlertId().replace("-", "");
    }
    if (event instanceof WebhookCallCancelledNotificationEvent) {
      return ((WebhookCallCancelledNotificationEvent) event).getAlertId().replace("-", "");
    }
    return null;
  }

  /** The payload {@code {"convohop": data}} as JSON. */
  private static String convohop(WebhookNotificationEvent event, Text text) {
    return Json.stringify(Collections.singletonMap("convohop", data(event, text)));
  }

  /** The {@code convohop} metadata, with the visible text when given. */
  private static Map<String, Object> data(WebhookNotificationEvent event, @Nullable Text text) {
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("eventId", event.getEventId());
    data.put("eventType", event.getEventType());
    data.put("occurredAt", event.getOccurredAt());
    data.put("projectId", event.getProjectId());
    data.put("recipientId", event.getRecipientId());
    data.put("conversationId", event.getConversationId());
    data.put("senderId", event.getSenderId());
    if (event instanceof WebhookMessageNotificationEvent) {
      data.put("messageId", ((WebhookMessageNotificationEvent) event).getMessageId());
    } else if (event instanceof WebhookCallNotificationEvent) {
      WebhookCallNotificationEvent call = (WebhookCallNotificationEvent) event;
      data.put("liveSessionId", call.getLiveSessionId());
      data.put("alertId", call.getAlertId());
      data.put("expiresAt", call.getExpiresAt());
      data.put("mediaProfile", call.getMediaProfile());
    } else {
      WebhookCallCancelledNotificationEvent cancelled = (WebhookCallCancelledNotificationEvent) event;
      data.put("liveSessionId", cancelled.getLiveSessionId());
      data.put("alertId", cancelled.getAlertId());
      data.put("expiresAt", cancelled.getExpiresAt());
      data.put("mediaProfile", cancelled.getMediaProfile());
      data.put("reason", cancelled.getReason());
    }
    if (text != null && text.title != null) {
      data.put("title", text.title);
    }
    if (text != null && text.body != null) {
      data.put("body", text.body);
    }
    return data;
  }

  /**
   * Builds the request, shortening the body and then the title while the measured payload exceeds the limit: each
   * becomes its longest code-point prefix that fits followed by {@code …}, or just {@code …} when no prefix fits.
   */
  private static <R> R fit(int limit, Text input, Function<Text, R> build, ToIntFunction<R> measure) {
    Text text = input;
    R request = build.apply(text);
    for (boolean body : new boolean[] {true, false}) {
      String original = body ? text.body : text.title;
      if (measure.applyAsInt(request) <= limit) {
        return request;
      }
      if (original == null) {
        continue;
      }
      // A prefix of more than `limit` code points is more than `limit` bytes, so it never fits.
      int[] points = original.codePoints().limit(limit + 1L).toArray();
      Text current = text;
      IntFunction<Text> shortened = count -> current.with(body, new String(points, 0, count) + ELLIPSIS);
      int low = 0;
      int high = points.length - 1;
      int best = 0;
      while (low <= high) {
        int middle = (low + high) >>> 1;
        if (measure.applyAsInt(build.apply(shortened.apply(middle))) <= limit) {
          best = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }
      text = shortened.apply(best);
      request = build.apply(text);
    }
    if (measure.applyAsInt(request) > limit) {
      throw new IllegalStateException("ConvoHop push: notification metadata exceeds " + limit + " bytes");
    }
    return request;
  }

  private static final class Text {
    final @Nullable String title;
    final @Nullable String body;

    Text(@Nullable String title, @Nullable String body) {
      this.title = title;
      this.body = body;
    }

    Text with(boolean body, String value) {
      return body ? new Text(title, value) : new Text(value, this.body);
    }
  }

  private static final class Lifetime {
    final long ttl;
    final long expiration;

    Lifetime(long ttl, long expiration) {
      this.ttl = ttl;
      this.expiration = expiration;
    }
  }
}
