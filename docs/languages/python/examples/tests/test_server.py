import asyncio
from dataclasses import dataclass
from uuid import uuid4

import pytest
from convohop import ConvoHop

from conformance_mock import FaultAction, MockTarget, attempts, inject_fault
from server import (
    ServerConfig,
    bootstrap_user,
    connect,
    connect_async,
    create_conversation,
    latest_messages,
    send_as,
    send_as_async,
    send_once,
)


@dataclass(frozen=True)
class Room:
    alice: str
    bob: str
    conversation_id: str


def set_up(server: ConvoHop, config: ServerConfig, title: str) -> Room:
    alice = bootstrap_user(server, config, f"alice-{uuid4()}", str(uuid4()))
    bob = bootstrap_user(server, config, f"bob-{uuid4()}", str(uuid4()))
    members = [alice["session"]["principalId"], bob["session"]["principalId"]]
    conversation_id = create_conversation(server, title, members, str(uuid4()))
    return Room(alice=members[0], bob=members[1], conversation_id=conversation_id)


def test_bootstrap_user_returns_the_same_principal_on_every_login_and_a_new_session(config: ServerConfig) -> None:
    with connect(config) as server:
        account_id = f"carol-{uuid4()}"
        first = bootstrap_user(server, config, account_id, str(uuid4()))
        second = bootstrap_user(server, config, account_id, str(uuid4()))
    assert second["session"]["principalId"] == first["session"]["principalId"]
    assert second["sessionToken"] != first["sessionToken"]
    assert first["baseUrl"] == config.base_url
    assert first["projectId"] == config.project_id
    assert first["session"]["incarnation"] == config.incarnation


def test_messages_are_listed_for_the_other_member_newest_first(config: ServerConfig) -> None:
    with connect(config) as server:
        room = set_up(server, config, "Launch plan")
        question = send_as(server, room.conversation_id, room.alice, "Ship it on Monday?", str(uuid4()))
        answer = send_as(server, room.conversation_id, room.bob, "Monday works.", str(uuid4()))
        messages = latest_messages(server, room.conversation_id, room.bob)
    assert [(message.message_id, message.author_id, message.text) for message in messages] == [
        (answer, room.bob, "Monday works."),
        (question, room.alice, "Ship it on Monday?"),
    ]


@pytest.mark.parametrize(
    ("action", "expected_attempts"),
    [("dropBeforeCommit", [True, False]), ("dropAfterCommit", [True])],
)
def test_send_once_posts_exactly_one_message_when_the_connection_drops(
    config: ServerConfig, mock_target: MockTarget, action: FaultAction, expected_attempts: list[bool]
) -> None:
    with connect(config) as server:
        room = set_up(server, config, f"Lost reply {action}")
        inject_fault(mock_target, "sendMessage", action)
        request_id = str(uuid4())
        message_id = send_once(server, room.conversation_id, room.alice, "Did it land?", request_id)
        messages = latest_messages(server, room.conversation_id, room.bob)
    assert message_id is not None
    assert [(message.message_id, message.text) for message in messages] == [(message_id, "Did it land?")]
    # The first attempt was dropped. Only a request that never reached the authority is sent again.
    assert attempts(mock_target, "sendMessage", request_id) == expected_attempts


def test_the_async_client_has_the_same_methods(config: ServerConfig) -> None:
    with connect(config) as server:
        room = set_up(server, config, "Async")

        async def send() -> str:
            async with connect_async(config) as client:
                return await send_as_async(client, room.conversation_id, room.alice, "Sent from asyncio", str(uuid4()))

        message_id = asyncio.run(send())
        messages = latest_messages(server, room.conversation_id, room.bob)
    assert [(message.message_id, message.text) for message in messages] == [(message_id, "Sent from asyncio")]
