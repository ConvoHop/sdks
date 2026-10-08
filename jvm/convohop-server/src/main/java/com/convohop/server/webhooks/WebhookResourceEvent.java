package com.convohop.server.webhooks;

/**
 * A change to a conversation, member, message, receipt or call. {@link #getSubjectRef()} names the resource.
 *
 * <p>The event types are {@code conversation.created}, {@code conversation.updated}, {@code member.added}, {@code
 * member.roleChanged}, {@code member.historyExpanded}, {@code member.removed}, {@code
 * member.broadcastPermissionChanged}, {@code message.created}, {@code message.edited}, {@code message.deleted},
 * {@code receipt.reported}, {@code live.started}, {@code live.participationChanged}, {@code live.alerted}, {@code
 * live.ready}, {@code live.connected} and {@code live.ended}.
 */
public final class WebhookResourceEvent extends WebhookEvent {
  WebhookResourceEvent(
      String eventId, String eventType, String occurredAt, String projectId, WebhookSubjectRef subjectRef) {
    super(eventId, eventType, occurredAt, projectId, subjectRef);
  }

  @Override
  public boolean isKnown() {
    return true;
  }
}
