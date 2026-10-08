package com.convohop.server.webhooks;

/** A verified delivery: its {@code webhook-id}, {@code webhook-timestamp} and event. */
public final class VerifiedWebhook extends WebhookSignature {
  private final WebhookEvent event;

  VerifiedWebhook(String webhookId, long timestamp, WebhookEvent event) {
    super(webhookId, timestamp);
    this.event = event;
  }

  /**
   * The delivery's metadata-only event.
   *
   * @return the event
   */
  public WebhookEvent getEvent() {
    return event;
  }

  @Override
  String details() {
    return ", event=" + event;
  }
}
