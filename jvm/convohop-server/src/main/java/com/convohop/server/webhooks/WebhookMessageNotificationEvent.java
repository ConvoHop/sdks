package com.convohop.server.webhooks;

import org.jspecify.annotations.Nullable;

/** {@code notification.message}: a message for the recipient. */
public final class WebhookMessageNotificationEvent extends WebhookNotificationEvent {
  private final String messageId;
  private final @Nullable WebhookNotificationPreview preview;

  WebhookMessageNotificationEvent(Fields fields, String messageId, @Nullable WebhookNotificationPreview preview) {
    super("notification.message", fields, new WebhookSubjectRef(messageId, "message"));
    this.messageId = messageId;
    this.preview = preview;
  }

  /**
   * The message.
   *
   * @return the message ID
   */
  public String getMessageId() {
    return messageId;
  }

  /**
   * The start of the message text, present only when the project opts in to message previews and the message has
   * text.
   *
   * @return the preview, or null
   */
  public @Nullable WebhookNotificationPreview getPreview() {
    return preview;
  }

  @Override
  String notificationDetails() {
    return ", messageId=" + messageId + ", preview=" + preview;
  }
}
