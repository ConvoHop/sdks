package com.convohop.server.webhooks;

/** A verified delivery's {@code webhook-id} and {@code webhook-timestamp}. */
public class WebhookSignature {
  private final String webhookId;
  private final long timestamp;

  WebhookSignature(String webhookId, long timestamp) {
    this.webhookId = webhookId;
    this.timestamp = timestamp;
  }

  /**
   * The delivery's {@code webhook-id}. Retries of a delivery keep it, so de-duplicate on it.
   *
   * @return the webhook ID
   */
  public String getWebhookId() {
    return webhookId;
  }

  /**
   * The delivery's {@code webhook-timestamp}.
   *
   * @return Unix seconds
   */
  public long getTimestamp() {
    return timestamp;
  }

  @Override
  public String toString() {
    return getClass().getSimpleName() + "{webhookId=" + webhookId + ", timestamp=" + timestamp + details() + "}";
  }

  String details() {
    return "";
  }
}
