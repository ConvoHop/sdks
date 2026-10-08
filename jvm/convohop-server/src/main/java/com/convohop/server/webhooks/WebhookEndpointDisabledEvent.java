package com.convohop.server.webhooks;

/**
 * {@code webhook.endpointDisabled}: one of the project's other webhook endpoints was disabled after repeated
 * failures. {@link #getSubjectRef()} names it, with kind {@code webhookEndpoint}.
 */
public final class WebhookEndpointDisabledEvent extends WebhookEvent {
  WebhookEndpointDisabledEvent(String eventId, String occurredAt, String projectId, WebhookSubjectRef subjectRef) {
    super(eventId, "webhook.endpointDisabled", occurredAt, projectId, subjectRef);
  }

  @Override
  public boolean isKnown() {
    return true;
  }
}
