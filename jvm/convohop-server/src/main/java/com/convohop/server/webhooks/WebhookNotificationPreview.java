package com.convohop.server.webhooks;

/**
 * The start of a message's text. Present only when the project opts in to message previews and the message has
 * text. {@link #toString()} omits the text.
 */
public final class WebhookNotificationPreview {
  private final String text;
  private final boolean truncated;

  WebhookNotificationPreview(String text, boolean truncated) {
    this.text = text;
    this.truncated = truncated;
  }

  /**
   * The start of the message text: 1 to 512 Unicode code points.
   *
   * @return the text
   */
  public String getText() {
    return text;
  }

  /**
   * Whether the message text continues after {@link #getText()}.
   *
   * @return whether the text is truncated
   */
  public boolean isTruncated() {
    return truncated;
  }

  @Override
  public String toString() {
    return "WebhookNotificationPreview{text=<redacted>, truncated=" + truncated + "}";
  }
}
