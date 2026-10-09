"""Webhooks quickstart snippets. tests/test_webhooks.py signs deliveries and runs them."""

# #region receive
from collections.abc import Callable, Sequence

from convohop import WebhookVerificationError, webhooks
from convohop.webhooks import WebhookEvent, WebhookHeaders


# Call this from your web framework's route, and answer with the HTTP status it returns. secrets are the
# endpoint's whsec_ secrets from your secret store. Pass every one you hold, so deliveries keep verifying
# during a secret rotation.
def receive_webhook(
    headers: WebhookHeaders,  # Your framework's request headers.
    body: bytes,  # The raw bytes, never re-serialized JSON.
    secrets: Sequence[str],
    enqueue: Callable[[str, WebhookEvent], None],
) -> int:
    try:
        delivery = webhooks.verify(headers=headers, body=body, secrets=secrets)
    except WebhookVerificationError as error:
        # INVALID_SECRET means your configuration is wrong, so fail loudly instead of answering 400.
        if error.code == "INVALID_SECRET":
            raise
        return 400
    # Respond within 5 seconds and process later. Deduplicate on webhook_id: delivery is at least once.
    enqueue(delivery.webhook_id, delivery.event)
    return 204


# #endregion receive

# #region handle
from typing import Protocol

from convohop import ConvoHop
from convohop.types import Conversation
from convohop.webhooks import (
    WebhookCallCancelledNotificationEvent,
    WebhookCallNotificationEvent,
    WebhookEndpointDisabledEvent,
    WebhookMessageNotificationEvent,
    WebhookNotificationEvent,
    WebhookResourceEvent,
)


# What your app does with the events it subscribes to.
class EventHandlers(Protocol):
    def conversation_changed(self, conversation: Conversation) -> None: ...
    def notify(self, event: WebhookNotificationEvent) -> None: ...  # Push to the recipient's devices.
    def endpoint_disabled(self, endpoint_id: str) -> None: ...


# Your queue worker. Events arrive at least once and in any order.
def handle_event(server: ConvoHop, event: WebhookEvent, handlers: EventHandlers) -> None:
    match event:
        case WebhookResourceEvent(event_type="conversation.created" | "conversation.updated"):
            # Events carry only IDs. Read the current state through the API.
            handlers.conversation_changed(server.get_conversation(conversation_id=event.subject_ref.id))
        case (
            WebhookMessageNotificationEvent() | WebhookCallNotificationEvent() | WebhookCallCancelledNotificationEvent()
        ):
            handlers.notify(event)
        case WebhookEndpointDisabledEvent():
            handlers.endpoint_disabled(event.subject_ref.id)  # Another of your endpoints kept failing.
        case _:
            # Other event types your endpoint subscribes to, and types this SDK doesn't know yet
            # (WebhookUnknownEvent, whose known is False). Acknowledge them and move on.
            pass


# #endregion handle
