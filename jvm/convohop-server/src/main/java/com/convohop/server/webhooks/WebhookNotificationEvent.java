package com.convohop.server.webhooks;

import com.convohop.server.internal.Json;
import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireException;

/**
 * A per-recipient notification event: the input of the push payload builders in {@link com.convohop.server.push}.
 * The contract is {@code spec/push-payload/}.
 *
 * <p>The subclasses are {@link WebhookMessageNotificationEvent} ({@code notification.message}), {@link
 * WebhookCallNotificationEvent} ({@code notification.call}) and {@link WebhookCallCancelledNotificationEvent}
 * ({@code notification.callCancelled}). Every instance matches the contract.
 */
public abstract class WebhookNotificationEvent extends WebhookEvent {
  private final String recipientId;
  private final String conversationId;
  private final String senderId;
  private final boolean connected;

  WebhookNotificationEvent(String eventType, Fields fields, WebhookSubjectRef subjectRef) {
    super(fields.eventId, eventType, fields.occurredAt, fields.projectId, subjectRef);
    this.recipientId = fields.recipientId;
    this.conversationId = fields.conversationId;
    this.senderId = fields.senderId;
    this.connected = fields.connected;
  }

  /**
   * Validates a notification event against the push payload contract, for events you stored or received other than
   * through {@link WebhookVerifier#verify}. Fields the contract doesn't define are ignored.
   *
   * @param json the event as JSON
   * @return the event
   * @throws IllegalArgumentException if the event doesn't match the contract; the message names the first invalid
   *     field without echoing values
   */
  public static WebhookNotificationEvent parse(String json) {
    Object value;
    try {
      value = Json.parse(Wire.nonNull(json, "json"));
    } catch (WireException notJson) {
      throw new IllegalArgumentException("Invalid notification event: event must be a JSON object");
    }
    try {
      return WebhookEvents.notification(value);
    } catch (WebhookEvents.MalformedNotification malformed) {
      throw new IllegalArgumentException("Invalid notification event: " + malformed.getMessage());
    }
  }

  /**
   * The principal to notify. Each recipient gets its own event.
   *
   * @return the recipient's principal ID
   */
  public String getRecipientId() {
    return recipientId;
  }

  /**
   * The conversation of the message or call.
   *
   * @return the conversation ID
   */
  public String getConversationId() {
    return conversationId;
  }

  /**
   * The principal who sent the message or started the ringing.
   *
   * @return the sender's principal ID
   */
  public String getSenderId() {
    return senderId;
  }

  /**
   * Whether the recipient had an active realtime connection when the event was produced. It is a hint for your
   * sending policy: it isn't per device, and it can change before you send. The push builders ignore it.
   *
   * @return whether the recipient was connected
   */
  public boolean isConnected() {
    return connected;
  }

  @Override
  public final boolean isKnown() {
    return true;
  }

  @Override
  String details() {
    return ", recipientId="
        + recipientId
        + ", conversationId="
        + conversationId
        + ", senderId="
        + senderId
        + ", connected="
        + connected
        + notificationDetails();
  }

  abstract String notificationDetails();

  /** The fields every notification event carries, validated. */
  static final class Fields {
    final String eventId;
    final String occurredAt;
    final String projectId;
    final String recipientId;
    final String conversationId;
    final String senderId;
    final boolean connected;

    Fields(
        String eventId,
        String occurredAt,
        String projectId,
        String recipientId,
        String conversationId,
        String senderId,
        boolean connected) {
      this.eventId = eventId;
      this.occurredAt = occurredAt;
      this.projectId = projectId;
      this.recipientId = recipientId;
      this.conversationId = conversationId;
      this.senderId = senderId;
      this.connected = connected;
    }
  }
}
