package com.convohop.server.webhooks;

/**
 * A verified delivery's metadata-only event. Fetch the resource through the API when you need its content.
 *
 * <p>The subclasses are {@link WebhookResourceEvent}, {@link WebhookEndpointDisabledEvent}, the {@link
 * WebhookNotificationEvent} types and {@link WebhookUnknownEvent}. Check {@link #isKnown()} or the subclass, then
 * {@link #getEventType()}.
 */
public abstract class WebhookEvent {
  private final String eventId;
  private final String eventType;
  private final String occurredAt;
  private final String projectId;
  private final WebhookSubjectRef subjectRef;

  WebhookEvent(String eventId, String eventType, String occurredAt, String projectId, WebhookSubjectRef subjectRef) {
    this.eventId = eventId;
    this.eventType = eventType;
    this.occurredAt = occurredAt;
    this.projectId = projectId;
    this.subjectRef = subjectRef;
  }

  /**
   * The event's ID. Retries and replays of its delivery keep it.
   *
   * @return the ID
   */
  public String getEventId() {
    return eventId;
  }

  /**
   * The event type, such as {@code message.created} or {@code notification.call}.
   *
   * @return the event type
   */
  public String getEventType() {
    return eventType;
  }

  /**
   * When the event occurred, as the sender wrote it (RFC 3339).
   *
   * @return the timestamp
   */
  public String getOccurredAt() {
    return occurredAt;
  }

  /**
   * The project the event belongs to.
   *
   * @return the project ID
   */
  public String getProjectId() {
    return projectId;
  }

  /**
   * The resource the event names.
   *
   * @return the subject
   */
  public WebhookSubjectRef getSubjectRef() {
    return subjectRef;
  }

  /**
   * Whether this SDK knows the event type. An unknown event, including a {@code notification.*} event that doesn't
   * match the push payload contract, is a {@link WebhookUnknownEvent}: acknowledge it.
   *
   * @return whether the event type is known
   */
  public abstract boolean isKnown();

  @Override
  public String toString() {
    return getClass().getSimpleName()
        + "{eventId="
        + eventId
        + ", eventType="
        + eventType
        + ", occurredAt="
        + occurredAt
        + ", projectId="
        + projectId
        + ", subjectRef="
        + subjectRef
        + details()
        + "}";
  }

  String details() {
    return "";
  }
}
