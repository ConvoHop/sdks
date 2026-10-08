package com.convohop.server.webhooks;

/** {@code notification.call}: an incoming call, as one ring for the recipient. */
public final class WebhookCallNotificationEvent extends WebhookNotificationEvent {
  private final String liveSessionId;
  private final String alertId;
  private final String expiresAt;
  private final String mediaProfile;

  WebhookCallNotificationEvent(
      Fields fields, String liveSessionId, String alertId, String expiresAt, String mediaProfile) {
    super("notification.call", fields, new WebhookSubjectRef(liveSessionId, "liveSession"));
    this.liveSessionId = liveSessionId;
    this.alertId = alertId;
    this.expiresAt = expiresAt;
    this.mediaProfile = mediaProfile;
  }

  /**
   * The call.
   *
   * @return the live session ID
   */
  public String getLiveSessionId() {
    return liveSessionId;
  }

  /**
   * This ring for this recipient. A later ring of the same call has a new alert ID.
   *
   * @return the alert ID
   */
  public String getAlertId() {
    return alertId;
  }

  /**
   * When the ringing stops if nobody answers (RFC 3339).
   *
   * @return the timestamp
   */
  public String getExpiresAt() {
    return expiresAt;
  }

  /**
   * The call's media profile: {@code AUDIO_ONLY}, {@code AUDIO_VIDEO} or a later profile, which you should accept.
   *
   * @return the media profile
   */
  public String getMediaProfile() {
    return mediaProfile;
  }

  @Override
  String notificationDetails() {
    return ", liveSessionId="
        + liveSessionId
        + ", alertId="
        + alertId
        + ", expiresAt="
        + expiresAt
        + ", mediaProfile="
        + mediaProfile;
  }
}
