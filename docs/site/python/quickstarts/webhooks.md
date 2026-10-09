# Python webhooks quickstart

Receive ConvoHop events in your Python backend with `convohop.webhooks`: verify each signed delivery, acknowledge it quickly, and handle its event in a queue worker.

## Before you start

Create a webhook endpoint for your project with the [`management.configureWebhook`](../../operations/management/configureWebhook.md) operation, and choose the event types it receives. Its signing secret starts with `whsec_` and is delivered once, so keep it in your secret store. [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md) replaces it.

## Verify deliveries

ConvoHop signs each delivery with the [Standard Webhooks](https://www.standardwebhooks.com) scheme. `webhooks.verify` checks the signature and timestamp against the raw body, and returns the delivery's webhook ID and event. It takes any web framework's request headers, such as the `request.headers` of Starlette, Django or Flask.

```python snippet=docs/languages/python/examples/src/webhooks.py#receive
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
```

- Pass every secret you hold. While a rotation is pending, ConvoHop signs with both the current and the next secret, and it signs with the replaced secret for 24 hours after the rotation.
- Answer within 5 seconds, and process the event afterwards.
- Delivery is at least once, and retries keep the webhook ID, so deduplicate on it.
- A failed check raises `WebhookVerificationError`, whose `code` names the check. Only `INVALID_SECRET` means your configuration is wrong. The [`WebhookVerificationError` reference](../reference/webhooks.md#webhookverificationerror-class) lists the others.

## Handle events

Events carry IDs and metadata, not content, so read the current state through the API. Events arrive in any order.

```python snippet=docs/languages/python/examples/src/webhooks.py#handle
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
```

`webhooks.verify` returns a `WebhookUnknownEvent`, whose `known` is `False`, for an event type that this SDK version doesn't know, and for a notification event that doesn't match the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md). Skip those events rather than failing, as `handle_event` does.

Notification events, such as `notification.message`, are addressed to one recipient and carry what a push notification needs. The [push notifications quickstart](push.md) sends them.

## Next steps

- [Push notifications quickstart](push.md): turn notification events into APNs, FCM and Web Push requests.
- [`WebhookEvent` reference](../reference/webhooks.md#webhookevent-type): every event type and its fields.
