package com.convohop.server.webhooks;

import com.convohop.server.internal.Json;
import com.convohop.server.internal.Rfc3339;
import com.convohop.server.internal.WireException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/** Parses event envelopes and validates notification events against {@code spec/push-payload/}. */
final class WebhookEvents {
  static final Set<String> RESOURCE_EVENT_TYPES =
      Collections.unmodifiableSet(
          new HashSet<>(
              Arrays.asList(
                  "conversation.created",
                  "conversation.updated",
                  "member.added",
                  "member.roleChanged",
                  "member.historyExpanded",
                  "member.removed",
                  "member.broadcastPermissionChanged",
                  "message.created",
                  "message.edited",
                  "message.deleted",
                  "receipt.reported",
                  "live.started",
                  "live.participationChanged",
                  "live.alerted",
                  "live.ready",
                  "live.connected",
                  "live.ended")));
  static final Set<String> NOTIFICATION_EVENT_TYPES =
      Collections.unmodifiableSet(
          new HashSet<>(
              Arrays.asList("notification.message", "notification.call", "notification.callCancelled")));

  private static final Pattern UUID =
      Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
  private static final String NIL_UUID = "00000000-0000-0000-0000-000000000000";
  private static final Pattern IDENTIFIER = Pattern.compile("[A-Za-z][A-Za-z0-9_]{0,63}");
  private static final int PREVIEW_LIMIT = 512;
  private static final String NOT_AN_ENVELOPE = "Webhook body is not a ConvoHop event envelope";

  private WebhookEvents() {}

  /** Parses a verified body. Unknown or malformed notification events become unknown events. */
  static WebhookEvent parse(byte[] body) {
    Object value;
    try {
      String text =
          StandardCharsets.UTF_8
              .newDecoder()
              .onMalformedInput(CodingErrorAction.REPORT)
              .onUnmappableCharacter(CodingErrorAction.REPORT)
              .decode(ByteBuffer.wrap(body))
              .toString();
      // TextDecoder drops a leading byte order mark.
      value = Json.parse(text.startsWith("\uFEFF") ? text.substring(1) : text);
    } catch (CharacterCodingException | WireException invalid) {
      throw new WebhookVerificationException(
          WebhookVerificationCode.INVALID_BODY, "Webhook body is not UTF-8 JSON");
    }
    Map<String, @Nullable Object> envelope = envelope(value);
    Map<String, @Nullable Object> subject = envelope(envelope.get("subjectRef"));
    String eventType = text(envelope, "eventType");
    WebhookSubjectRef subjectRef = new WebhookSubjectRef(text(subject, "id"), text(subject, "kind"));
    String eventId = text(envelope, "eventId");
    String occurredAt = text(envelope, "occurredAt");
    String projectId = text(envelope, "projectId");
    if (RESOURCE_EVENT_TYPES.contains(eventType)) {
      return new WebhookResourceEvent(eventId, eventType, occurredAt, projectId, subjectRef);
    }
    if ("webhook.endpointDisabled".equals(eventType) && "webhookEndpoint".equals(subjectRef.getKind())) {
      return new WebhookEndpointDisabledEvent(eventId, occurredAt, projectId, subjectRef);
    }
    if (NOTIFICATION_EVENT_TYPES.contains(eventType)) {
      try {
        return notification(envelope);
      } catch (MalformedNotification malformed) {
        // A notification event that breaks the contract is returned like an unknown event type.
      }
    }
    return new WebhookUnknownEvent(eventId, eventType, occurredAt, projectId, subjectRef);
  }

  @SuppressWarnings("unchecked")
  private static Map<String, @Nullable Object> envelope(@Nullable Object value) {
    if (!(value instanceof Map)) {
      throw new WebhookVerificationException(WebhookVerificationCode.INVALID_BODY, NOT_AN_ENVELOPE);
    }
    return (Map<String, @Nullable Object>) value;
  }

  private static String text(Map<String, @Nullable Object> record, String field) {
    Object value = record.get(field);
    if (!(value instanceof String) || ((String) value).isEmpty()) {
      throw new WebhookVerificationException(WebhookVerificationCode.INVALID_BODY, NOT_AN_ENVELOPE);
    }
    return (String) value;
  }

  /** A notification event that breaks the contract. The message names the first invalid field, never its value. */
  static final class MalformedNotification extends Exception {
    private static final long serialVersionUID = 1L;

    MalformedNotification(String problem) {
      super(problem, null, false, false);
    }
  }

  static WebhookNotificationEvent notification(@Nullable Object value) throws MalformedNotification {
    Map<String, @Nullable Object> source = object(value, "event");
    Object eventType = source.get("eventType");
    need(
        eventType instanceof String && NOTIFICATION_EVENT_TYPES.contains(eventType),
        "eventType must be a notification event type");
    WebhookNotificationEvent.Fields fields =
        new WebhookNotificationEvent.Fields(
            uuid(source, "eventId"),
            timestamp(source, "occurredAt"),
            uuid(source, "projectId"),
            uuid(source, "recipientId"),
            uuid(source, "conversationId"),
            uuid(source, "senderId"),
            flag(source, "connected"));
    if ("notification.message".equals(eventType)) {
      String messageId = uuid(source, "messageId");
      subject(source, "message", messageId);
      WebhookNotificationPreview preview = source.containsKey("preview") ? preview(source.get("preview")) : null;
      return new WebhookMessageNotificationEvent(fields, messageId, preview);
    }
    String liveSessionId = uuid(source, "liveSessionId");
    subject(source, "liveSession", liveSessionId);
    String alertId = uuid(source, "alertId");
    String expiresAt = timestamp(source, "expiresAt");
    String mediaProfile = identifier(source, "mediaProfile");
    if ("notification.call".equals(eventType)) {
      return new WebhookCallNotificationEvent(fields, liveSessionId, alertId, expiresAt, mediaProfile);
    }
    return new WebhookCallCancelledNotificationEvent(
        fields, liveSessionId, alertId, expiresAt, mediaProfile, identifier(source, "reason"));
  }

  private static void need(boolean condition, String problem) throws MalformedNotification {
    if (!condition) {
      throw new MalformedNotification(problem);
    }
  }

  @SuppressWarnings("unchecked")
  private static Map<String, @Nullable Object> object(@Nullable Object value, String field)
      throws MalformedNotification {
    need(value instanceof Map, field + " must be an object");
    return (Map<String, @Nullable Object>) value;
  }

  private static String uuid(Map<String, @Nullable Object> source, String field) throws MalformedNotification {
    Object value = source.get(field);
    need(
        value instanceof String && UUID.matcher((String) value).matches() && !NIL_UUID.equals(value),
        field + " must be a lowercase, non-nil UUID");
    return (String) value;
  }

  private static String timestamp(Map<String, @Nullable Object> source, String field) throws MalformedNotification {
    Object value = source.get(field);
    need(
        value instanceof String && Rfc3339.epochSeconds((String) value).isPresent(),
        field + " must be an RFC 3339 timestamp");
    return (String) value;
  }

  private static String identifier(Map<String, @Nullable Object> source, String field)
      throws MalformedNotification {
    Object value = source.get(field);
    need(
        value instanceof String && IDENTIFIER.matcher((String) value).matches(),
        field + " must be an ASCII letter followed by up to 63 ASCII letters, digits or _");
    return (String) value;
  }

  private static boolean flag(Map<String, @Nullable Object> source, String field) throws MalformedNotification {
    Object value = source.get(field);
    need(value instanceof Boolean, field + " must be a boolean");
    return (Boolean) value;
  }

  private static WebhookNotificationPreview preview(@Nullable Object value) throws MalformedNotification {
    Map<String, @Nullable Object> source = object(value, "preview");
    Object text = source.get("text");
    need(
        text instanceof String
            && !((String) text).isEmpty()
            && ((String) text).length() <= 2 * PREVIEW_LIMIT
            && !Json.hasLoneSurrogate((String) text)
            && ((String) text).codePointCount(0, ((String) text).length()) <= PREVIEW_LIMIT,
        "preview.text must be 1 to " + PREVIEW_LIMIT + " Unicode code points");
    return new WebhookNotificationPreview((String) text, flag(source, "truncated"));
  }

  private static void subject(Map<String, @Nullable Object> source, String kind, String id)
      throws MalformedNotification {
    Map<String, @Nullable Object> value = object(source.get("subjectRef"), "subjectRef");
    need(
        kind.equals(value.get("kind")) && id.equals(value.get("id")),
        "subjectRef must be the " + kind + " the event names");
  }
}
