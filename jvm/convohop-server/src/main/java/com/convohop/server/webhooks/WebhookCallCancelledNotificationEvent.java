package com.convohop.server.webhooks;

/**
 * {@code notification.callCancelled}: a ring that stopped for the recipient. Only recipients of the ring's {@code
 * notification.call} get it.
 */
public final class WebhookCallCancelledNotificationEvent extends WebhookNotificationEvent {
  private final String liveSessionId;
  private final String alertId;
  private final String expiresAt;
  private final String mediaProfile;
  private final String reason;

  WebhookCallCancelledNotificationEvent(
      Fields fields, String liveSessionId, String alertId, String expiresAt, String mediaProfile, String reason) {
    super("notification.callCancelled", fields, new WebhookSubjectRef(liveSessionId, "liveSession"));
    this.liveSessionId = liveSessionId;
    this.alertId = alertId;
    this.expiresAt = expiresAt;
    this.mediaProfile = mediaProfile;
    this.reason = reason;
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
   * The alert ID of the ring that stopped.
   *
   * @return the alert ID
   */
  public String getAlertId() {
    return alertId;
  }

  /**
   * The stopped ring's original deadline (RFC 3339).
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

  /**
   * Why the ring stopped. {@code answered} and {@code declined} (by the recipient, on any device) only stop the
   * ringing. {@code ended} (the call ended or stopped ringing before the recipient answered) and {@code expired}
   * (nobody answered by the deadline) are missed calls. Treat a later reason as "stop ringing", without a missed
   * call.
   *
   * @return the reason
   */
  public String getReason() {
    return reason;
  }

  /**
   * Whether the recipient missed the call: the reason is {@code ended} or {@code expired}.
   *
   * @return whether the call was missed
   */
  public boolean isMissedCall() {
    return "ended".equals(reason) || "expired".equals(reason);
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
        + mediaProfile
        + ", reason="
        + reason;
  }
}
