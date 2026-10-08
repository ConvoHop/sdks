package com.convohop.server.webhooks;

/**
 * An event this SDK does not know, including a {@code notification.*} event that doesn't match the push payload
 * contract. Acknowledge it; it never makes {@link WebhookVerifier#verify} fail.
 */
public final class WebhookUnknownEvent extends WebhookEvent {
  WebhookUnknownEvent(
      String eventId, String eventType, String occurredAt, String projectId, WebhookSubjectRef subjectRef) {
    super(eventId, eventType, occurredAt, projectId, subjectRef);
  }

  @Override
  public boolean isKnown() {
    return false;
  }
}
