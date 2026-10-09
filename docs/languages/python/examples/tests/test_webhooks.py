from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import pytest
from convohop import WebhookVerificationError
from convohop.types import Conversation
from convohop.webhooks import WebhookEvent, WebhookNotificationEvent

from deliveries import new_secret, sign_delivery, wire_json
from server import ServerConfig, bootstrap_user, connect, create_conversation
from vectors import push_vectors
from webhooks import handle_event, receive_webhook


@dataclass(frozen=True)
class Delivery:
    webhook_id: str
    headers: dict[str, str]
    body: bytes


def delivery(event: dict[str, Any], secret: str, *, body: str | None = None) -> Delivery:
    signed = wire_json(event)
    webhook_id, headers = sign_delivery(signed, secret)
    return Delivery(webhook_id, headers, (signed if body is None else body).encode())


def envelope(event_type: str, kind: str, subject_id: str, project_id: str = "project-1") -> dict[str, Any]:
    return {
        "eventId": str(uuid4()),
        "eventType": event_type,
        "occurredAt": datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "projectId": project_id,
        "subjectRef": {"kind": kind, "id": subject_id},
    }


@dataclass
class Queue:
    received: list[tuple[str, WebhookEvent]] = field(default_factory=list)

    def enqueue(self, webhook_id: str, event: WebhookEvent) -> None:
        self.received.append((webhook_id, event))


@dataclass
class RecordingHandlers:
    calls: list[tuple[object, ...]] = field(default_factory=list)

    def conversation_changed(self, conversation: Conversation) -> None:
        self.calls.append(("conversation_changed", conversation.conversation_id, conversation.title))

    def notify(self, event: WebhookNotificationEvent) -> None:
        self.calls.append(("notify", event))

    def endpoint_disabled(self, endpoint_id: str) -> None:
        self.calls.append(("endpoint_disabled", endpoint_id))


def test_receive_webhook_accepts_a_signed_delivery_including_during_a_secret_rotation() -> None:
    current, upcoming = new_secret(), new_secret()
    queue = Queue()
    event = envelope("conversation.created", "conversation", str(uuid4()))
    for secret in (current, upcoming):
        signed = delivery(event, secret)
        assert receive_webhook(signed.headers, signed.body, [current, upcoming], queue.enqueue) == 204
        assert queue.received[-1][0] == signed.webhook_id
    received = queue.received[0][1]
    assert received.known
    assert received.to_dict() == event


def test_receive_webhook_answers_400_without_enqueuing_a_delivery_that_fails_verification() -> None:
    secret = new_secret()
    queue = Queue()
    event = envelope("message.created", "message", str(uuid4()))
    tampered = delivery(event, secret, body=wire_json({**event, "eventType": "message.deleted"}))
    assert receive_webhook(tampered.headers, tampered.body, [secret], queue.enqueue) == 400
    wrong_secret = delivery(event, new_secret())
    assert receive_webhook(wrong_secret.headers, wrong_secret.body, [secret], queue.enqueue) == 400
    unsigned = {"content-type": "application/json"}
    assert receive_webhook(unsigned, wire_json(event).encode(), [secret], queue.enqueue) == 400
    assert queue.received == []


def test_receive_webhook_raises_when_its_own_secret_is_misconfigured() -> None:
    signed = delivery(envelope("conversation.created", "conversation", str(uuid4())), new_secret())
    with pytest.raises(WebhookVerificationError) as raised:
        receive_webhook(signed.headers, signed.body, ["not-a-webhook-secret"], Queue().enqueue)
    assert raised.value.code == "INVALID_SECRET"


def test_handle_event_reads_changed_conversations_and_routes_notifications(config: ServerConfig) -> None:
    notification = next(
        vector["event"] for vector in push_vectors() if vector["event"]["eventType"] == "notification.message"
    )
    with connect(config) as server:
        login = bootstrap_user(server, config, f"alice-{uuid4()}", str(uuid4()))
        conversation_id = create_conversation(server, "Webhooks", [login["session"]["principalId"]], str(uuid4()))

        secret = new_secret()
        queue = Queue()
        for event in [
            envelope("conversation.created", "conversation", conversation_id, config.project_id),
            envelope("message.created", "message", str(uuid4()), config.project_id),
            notification,
            envelope("webhook.endpointDisabled", "webhookEndpoint", "endpoint-orders", config.project_id),
            envelope("thread.archived", "thread", str(uuid4()), config.project_id),  # A type from a newer ConvoHop.
        ]:
            signed = delivery(event, secret)
            assert receive_webhook(signed.headers, signed.body, [secret], queue.enqueue) == 204

        handlers = RecordingHandlers()
        for _, received in queue.received:
            handle_event(server, received, handlers)
    assert handlers.calls == [
        ("conversation_changed", conversation_id, "Webhooks"),
        ("notify", queue.received[2][1]),
        ("endpoint_disabled", "endpoint-orders"),
    ]
    assert queue.received[2][1].known
    assert not queue.received[4][1].known
